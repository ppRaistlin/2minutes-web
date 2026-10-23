-- 2Minutes Web V1.0.44 — Anonymous staging, authenticated editorial approval.
-- INSTALL ONLY AFTER reviewing supabase-import-editorial-2min-v1.sql from V1.0.43.
-- Never exposes the editorial source documents or privileged write RPCs to anon.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.tm_editorial_importers') IS NULL
  OR to_regprocedure('public.tm_import_editorial_2min_v2(jsonb)') IS NULL
  OR to_regclass('public.tm_allowed_media') IS NULL
 THEN RAISE EXCEPTION 'Import V1.0.43 prerequisites missing; do not apply this migration yet'; END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.tm_editorial_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 file_sha256 text NOT NULL UNIQUE CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
 document jsonb NOT NULL,
 reference_title text NOT NULL,
 pairs_count integer NOT NULL CHECK (pairs_count BETWEEN 1 AND 25),
 sender_hash text NOT NULL CHECK (sender_hash ~ '^[0-9a-f]{64}$'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid,
 import_report jsonb
);
CREATE INDEX IF NOT EXISTS idx_tm_editorial_pending_time ON public.tm_editorial_submissions (status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tm_editorial_sender_time ON public.tm_editorial_submissions (sender_hash,created_at DESC);
ALTER TABLE public.tm_editorial_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_editorial_submissions FROM PUBLIC,anon,authenticated;

-- Called ONLY from the Edge function using Supabase service_role after decryption.
-- This stage performs zero inserts in articles, links, excerpts or votes.
CREATE OR REPLACE FUNCTION public.tm_stage_2min_submission_v1(p_document jsonb,p_sha256 text,p_sender_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 v_id uuid;
 v_status text;
 v_n integer;
 v_ref text;
 v_ref_domain text;
 v_pair jsonb;
 v_url text;
 v_domain text;
 v_seen text[] := '{}';
 v_count integer;
BEGIN
 IF p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$' OR p_sender_hash IS NULL OR p_sender_hash !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'Malformed submission metadata' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_sender_hash),624403);
 SELECT id,status INTO v_id,v_status FROM public.tm_editorial_submissions WHERE file_sha256=p_sha256;
 IF v_id IS NOT NULL THEN
  RETURN jsonb_build_object('id',v_id,'status',CASE WHEN v_status='pending' THEN 'already_pending' ELSE 'already_processed' END);
 END IF;
 -- One external actor cannot saturate the queue through normal submission paths.
 SELECT count(*) INTO v_count FROM public.tm_editorial_submissions
 WHERE sender_hash=p_sender_hash AND created_at>now()-interval '1 hour';
 IF v_count>=5 THEN RAISE EXCEPTION 'Too many submissions from this source; retry later' USING ERRCODE='22023'; END IF;
 IF p_document IS NULL OR jsonb_typeof(p_document)<>'object'
  OR pg_catalog.length(p_document::text)>204800
  OR p_document->>'format' IS DISTINCT FROM '2minutes-article-confrontation'
  OR p_document->>'format_version' IS DISTINCT FROM '0.1-draft'
  OR p_document->>'status' IS DISTINCT FROM 'user_approved'
  OR jsonb_typeof(p_document->'reference_article')<>'object'
  OR jsonb_typeof(p_document->'pairs')<>'array'
 THEN RAISE EXCEPTION 'Unsupported or malformed 2min file' USING ERRCODE='22023'; END IF;
 v_n=jsonb_array_length(p_document->'pairs');
 IF v_n NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'Incorrect number of pairs' USING ERRCODE='22023'; END IF;
 IF coalesce(p_document->>'search_language','') !~ '^[a-z]{2}(-[A-Za-z]{2})?$'
 THEN RAISE EXCEPTION 'Invalid search language' USING ERRCODE='22023'; END IF;
 v_ref=p_document->'reference_article'->>'url';
 IF v_ref IS NULL OR pg_catalog.length(v_ref)>4000
 OR v_ref !~ '^https?://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(/[^[:space:]#\\]*)?$'
 OR v_ref ~ '[#@]' OR v_ref LIKE '%://www.%' OR pg_catalog.length(coalesce(p_document->'reference_article'->>'title','')) NOT BETWEEN 1 AND 500
 THEN RAISE EXCEPTION 'Reference URL/title invalid' USING ERRCODE='22023'; END IF;
 v_ref_domain=lower(split_part(split_part(v_ref,'://',2),'/',1));
 IF NOT EXISTS(SELECT 1 FROM public.tm_allowed_media WHERE domain=v_ref_domain)
 THEN RAISE EXCEPTION 'Reference media not authorised: %',v_ref_domain USING ERRCODE='22023'; END IF;
 FOR v_pair IN SELECT value FROM jsonb_array_elements(p_document->'pairs') LOOP
  IF jsonb_typeof(v_pair)<>'object' OR v_pair->>'approval' IS DISTINCT FROM 'accepted'
    OR jsonb_typeof(v_pair->'target_article')<>'object'
  THEN RAISE EXCEPTION 'Unapproved/malformed pair' USING ERRCODE='22023'; END IF;
  v_url=v_pair->'target_article'->>'url';
  IF v_url IS NULL OR pg_catalog.length(v_url)>4000
   OR v_url !~ '^https?://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(/[^[:space:]#\\]*)?$'
   OR v_url ~ '[#@]' OR v_url LIKE '%://www.%'
   OR v_url=v_ref OR v_url=ANY(v_seen)
   OR pg_catalog.length(coalesce(v_pair->'target_article'->>'title','')) NOT BETWEEN 1 AND 500
   OR char_length(coalesce(v_pair->>'target_excerpt','')) NOT BETWEEN 12 AND 600
   OR jsonb_typeof(v_pair->'reference_claim')<>'object'
   OR jsonb_typeof(v_pair->'counter_claim')<>'object'
   OR char_length(coalesce(v_pair->'reference_claim'->>'text','')) NOT BETWEEN 1 AND 3000
   OR char_length(coalesce(v_pair->'counter_claim'->>'text','')) NOT BETWEEN 1 AND 3000
   OR char_length(coalesce(v_pair->>'explanation','')) NOT BETWEEN 1 AND 5000
   OR jsonb_typeof(v_pair->'evidence_urls')<>'array'
  THEN RAISE EXCEPTION 'Invalid pair or excerpt' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(v_pair->'evidence_urls') NOT BETWEEN 2 AND 12
   OR NOT (v_pair->'evidence_urls') ? v_ref
   OR NOT (v_pair->'evidence_urls') ? v_url
  THEN RAISE EXCEPTION 'Invalid evidence links' USING ERRCODE='22023'; END IF;
  v_domain=lower(split_part(split_part(v_url,'://',2),'/',1));
  IF NOT EXISTS(SELECT 1 FROM public.tm_allowed_media WHERE domain=v_domain)
  THEN RAISE EXCEPTION 'Target media not authorised: %',v_domain USING ERRCODE='22023'; END IF;
  v_seen=array_append(v_seen,v_url);
 END LOOP;
 INSERT INTO public.tm_editorial_submissions(file_sha256,document,reference_title,pairs_count,sender_hash)
 VALUES(p_sha256,p_document,p_document->'reference_article'->>'title',v_n,p_sender_hash)
 ON CONFLICT(file_sha256) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN
  SELECT id,status INTO v_id,v_status FROM public.tm_editorial_submissions WHERE file_sha256=p_sha256;
  RETURN jsonb_build_object('id',v_id,'status',CASE WHEN v_status='pending' THEN 'already_pending' ELSE 'already_processed' END);
 END IF;
 RETURN jsonb_build_object('id',v_id,'status','pending');
END
$fn$;
REVOKE ALL ON FUNCTION public.tm_stage_2min_submission_v1(jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tm_stage_2min_submission_v1(jsonb,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.tm_list_pending_2min_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.tm_editorial_importers WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'Editorial review not authorised' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'reference_title',reference_title,
   'pairs_count',pairs_count,'created_at',created_at,'document',document) ORDER BY created_at), '[]'::jsonb)
 INTO v_result FROM (SELECT * FROM public.tm_editorial_submissions
   WHERE status='pending' ORDER BY created_at ASC LIMIT 40) AS pending;
 RETURN v_result;
END
$fn$;
REVOKE ALL ON FUNCTION public.tm_list_pending_2min_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_list_pending_2min_v1() TO authenticated;

-- The existing authenticated editorial import is reused inside the SAME SQL transaction.
CREATE OR REPLACE FUNCTION public.tm_approve_2min_submission_v1(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_doc jsonb;v_status text;v_report jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.tm_editorial_importers WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'Editorial approval not authorised' USING ERRCODE='42501'; END IF;
 SELECT document,status INTO v_doc,v_status FROM public.tm_editorial_submissions WHERE id=p_id FOR UPDATE;
 IF v_doc IS NULL THEN RAISE EXCEPTION 'Submission missing' USING ERRCODE='22023'; END IF;
 IF v_status<>'pending' THEN RAISE EXCEPTION 'Submission already reviewed' USING ERRCODE='22023'; END IF;
 SELECT public.tm_import_editorial_2min_v2(v_doc) INTO v_report;
 UPDATE public.tm_editorial_submissions SET status='approved',reviewed_by=auth.uid(),
  reviewed_at=now(),import_report=v_report WHERE id=p_id;
 RETURN v_report;
END
$fn$;
REVOKE ALL ON FUNCTION public.tm_approve_2min_submission_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_approve_2min_submission_v1(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tm_reject_2min_submission_v1(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.tm_editorial_importers WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'Editorial rejection not authorised' USING ERRCODE='42501'; END IF;
 UPDATE public.tm_editorial_submissions SET status='rejected',reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=p_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Submission missing or already reviewed' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('status','rejected','id',p_id);
END
$fn$;
REVOKE ALL ON FUNCTION public.tm_reject_2min_submission_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_reject_2min_submission_v1(uuid) TO authenticated;
COMMIT;
