-- 2minutes V2.1 — Supabase community backend
-- Run once in Supabase SQL Editor. Safe to rerun.
create extension if not exists pgcrypto;

create table if not exists public.tm_allowed_media (domain text primary key);
insert into public.tm_allowed_media(domain) values
  ('1792exchange.com'),
  ('1819news.com'),
  ('1news.co.nz'),
  ('20minutes.fr'),
  ('21wire.com'),
  ('2paragraphs.com'),
  ('350.org'),
  ('7news.com.au'),
  ('9news.com.au'),
  ('aa.com.tr'),
  ('abc.com'),
  ('abc.es'),
  ('abc.net.au'),
  ('abcnews.go.com'),
  ('abqjournal.com'),
  ('aclu.org'),
  ('activistpost.com'),
  ('acton.org'),
  ('aflcio.org'),
  ('afp.com'),
  ('africanarguments.org'),
  ('aftonbladet.se'),
  ('ahvalnews.com'),
  ('aim.org'),
  ('al-monitor.com'),
  ('aleteia.org'),
  ('aljazeera.com'),
  ('alternet.org'),
  ('amac.us'),
  ('americanactionforum.org'),
  ('americanmilitarynews.com'),
  ('americanspectator.org'),
  ('americanwirenews.com'),
  ('amgreatness.com'),
  ('amnesty.org'),
  ('anadoluagency.com'),
  ('ansa.it'),
  ('ap.org'),
  ('apnews.com'),
  ('arkansasonline.com'),
  ('arstechnica.com'),
  ('atlanticcouncil.org'),
  ('atlasobscura.com'),
  ('autostraddle.com'),
  ('axios.com'),
  ('aynrand.org'),
  ('azmirror.com'),
  ('ballotpedia.org'),
  ('bangkokpost.com'),
  ('barrons.com'),
  ('bbc.co.uk'),
  ('bbc.com'),
  ('bearingarms.com'),
  ('beforeitsnews.com'),
  ('berkeleyside.org'),
  ('berlingske.dk'),
  ('bfmtv.com'),
  ('bigthink.com'),
  ('bild.de'),
  ('billmoyers.com'),
  ('bipartisanpolicy.org'),
  ('bizpacreview.com'),
  ('blackagendareport.com'),
  ('blacklivesmatter.com'),
  ('bleedingheartland.com'),
  ('bluelivesmatter.blue'),
  ('boingboing.net'),
  ('bostonherald.com'),
  ('bostonreview.net'),
  ('breakthroughnews.org'),
  ('breitbart.com'),
  ('brookings.edu'),
  ('brownstone.org'),
  ('brusselssignal.eu'),
  ('brut.media'),
  ('buckscountybeacon.com'),
  ('business-standard.com'),
  ('businessinsider.com'),
  ('buzzfeed.com'),
  ('buzzfeednews.com'),
  ('bvoltaire.fr'),
  ('bylinetimes.com'),
  ('c-span.org'),
  ('cadtm.org'),
  ('calgaryherald.com'),
  ('campusreform.org'),
  ('canadiandimension.com'),
  ('capital.fr'),
  ('capitalandmain.com'),
  ('care2.com'),
  ('catholicworldreport.com'),
  ('cato.org'),
  ('causeur.fr'),
  ('cbc.ca'),
  ('cbs.com'),
  ('cbsnews.com'),
  ('centerforamericanprogress.org'),
  ('channelnewsasia.com'),
  ('chicagotribune.com'),
  ('christianitytoday.com'),
  ('christianpost.com'),
  ('christiansciencemonitor.com'),
  ('cicero.de'),
  ('citizenfreepress.com'),
  ('city-journal.org'),
  ('claremont.org'),
  ('clarin.com'),
  ('cnbc.com'),
  ('cnews.fr'),
  ('cnn.com'),
  ('coloradospringsgazette.com'),
  ('coloradotimesreporter.com'),
  ('colorlines.com'),
  ('commentarymagazine.com'),
  ('commondreams.org'),
  ('communemag.com'),
  ('compactmag.com'),
  ('conservativereview.com'),
  ('consortiumnews.com'),
  ('consumerreports.org'),
  ('corriere.it'),
  ('cosmopolitan.com'),
  ('countercurrents.org'),
  ('counterpunch.org'),
  ('courrierinternational.com'),
  ('cpusa.org'),
  ('crikey.com.au'),
  ('crimethinc.com'),
  ('crooked.com'),
  ('crooksandliars.com'),
  ('csmonitor.com'),
  ('currentaffairs.org'),
  ('dailybeast.com'),
  ('dailycaller.com'),
  ('dailyexpress.co.uk'),
  ('dailykos.com'),
  ('dailymail.co.uk'),
  ('dailysignal.com'),
  ('dailywire.com'),
  ('dallasnews.com'),
  ('democracynow.org'),
  ('democraticunderground.com'),
  ('denvergazette.com'),
  ('deseretnews.com'),
  ('desmogblog.com'),
  ('detroitnews.com'),
  ('diepresse.com'),
  ('dissentmagazine.org'),
  ('dn.se'),
  ('donaldjtrump.com'),
  ('doubledown.news'),
  ('dpa-international.com'),
  ('dropsitenews.com'),
  ('drudgereport.com'),
  ('dw.com'),
  ('economist.com'),
  ('ecowatch.com'),
  ('edmontonjournal.com'),
  ('edmontonjsun.com'),
  ('efe.com'),
  ('electronicintifada.net'),
  ('elfinanciero.com.mx'),
  ('elitedaily.com'),
  ('elle.com'),
  ('elmundo.es'),
  ('elpais.com'),
  ('eluniverso.com'),
  ('esquire.com'),
  ('etc.se'),
  ('eurasiantimes.com'),
  ('europe1.fr'),
  ('everydayfeminism.com'),
  ('expressen.se'),
  ('expresso.pt'),
  ('factcheck.org'),
  ('fee.org'),
  ('feministcurrent.com'),
  ('financialpost.com'),
  ('floridaphoenix.com'),
  ('focus.de'),
  ('forbiddenstories.org'),
  ('foreignpolicy.com'),
  ('fortune.com'),
  ('foxbusiness.com'),
  ('foxnews.com'),
  ('france.tv'),
  ('france24.com'),
  ('franceinfo.fr'),
  ('freerepublic.com'),
  ('frontpagemag.com'),
  ('ft.com'),
  ('gallup.com'),
  ('gatewaypundit.com'),
  ('georgiarecorder.com'),
  ('gizmodo.com'),
  ('glaad.org'),
  ('globalresearch.ca'),
  ('globalvoices.org'),
  ('gq.com'),
  ('greenleft.org.au'),
  ('guardian.com'),
  ('haaretz.com'),
  ('harpersbazaar.com'),
  ('heritage.org'),
  ('hotair.com'),
  ('hrw.org'),
  ('hudson.org'),
  ('huffingtonpost.com'),
  ('huffpost.co.uk'),
  ('huffpost.com'),
  ('humanevents.com'),
  ('humanite.fr'),
  ('hurriyet.com.tr'),
  ('idahocapitalsun.com'),
  ('ijr.org'),
  ('ilgiornale.it'),
  ('illypolicies.org'),
  ('independent.co.uk'),
  ('independent.ie'),
  ('infowars.com'),
  ('intellectualtakeout.org'),
  ('inthesetimes.com'),
  ('investors.com'),
  ('iowacapitaldispatch.com'),
  ('ipsos.com'),
  ('israelhayom.com'),
  ('israelinationalnews.com'),
  ('israeliyom.com'),
  ('jacobinmag.com'),
  ('jewishvoiceforpeace.org'),
  ('jezebel.com'),
  ('journaldemontreal.com'),
  ('junge-welt.de'),
  ('jungewelt.de'),
  ('kansasreflector.com'),
  ('kentuckylantern.com'),
  ('ladepeche.fr'),
  ('lalibre.be'),
  ('lastampa.it'),
  ('latimes.com'),
  ('lefigaro.fr'),
  ('legalinsurrection.com'),
  ('lemediatv.fr'),
  ('lemonde.fr'),
  ('leparisien.fr'),
  ('lepoint.fr'),
  ('les-crises.fr'),
  ('lesechos.fr'),
  ('lgbtqnation.com'),
  ('liberation.fr'),
  ('libertyheadlines.com'),
  ('libertynation.com'),
  ('lopinion.fr'),
  ('louisianailluminator.com'),
  ('mainebeacon.com'),
  ('manhattaninstitute.org'),
  ('marianne.net'),
  ('mashable.com'),
  ('media-research-center.org'),
  ('mediamatters.org'),
  ('mediapart.fr'),
  ('meduza.io'),
  ('meidastouch.com'),
  ('michiganadvance.com'),
  ('middleeastmonitor.com'),
  ('military.com'),
  ('minnesotareformer.com'),
  ('mises.org'),
  ('mississippifreepress.org'),
  ('missouriindependent.com'),
  ('monde-diplomatique.fr'),
  ('monthlyreview.org'),
  ('motherjones.com'),
  ('mothership.sg'),
  ('mrc.org'),
  ('msmagazine.com'),
  ('msnbc.com'),
  ('naacp.org'),
  ('nationalpost.com'),
  ('nationalreview.com'),
  ('nationofchange.org'),
  ('naturalnews.com'),
  ('nbc.com'),
  ('nbcnews.com'),
  ('nd-aktuell.de'),
  ('nebraskaexaminer.com'),
  ('nevadacurrent.com'),
  ('newint.org'),
  ('newrepublic.com'),
  ('newsbusters.org'),
  ('newsmax.com'),
  ('newstatesman.com'),
  ('newsweek.com'),
  ('newyorker.com'),
  ('nhk.or.jp'),
  ('nos.nl'),
  ('nouvelobs.com'),
  ('novaramedia.com'),
  ('npr.org'),
  ('nra.org'),
  ('nymag.com'),
  ('nypost.com'),
  ('nysun.com'),
  ('nytimes.com'),
  ('nzherald.co.nz'),
  ('nzz.ch'),
  ('oann.com'),
  ('ohiocapitaljournal.com'),
  ('oklahomavoice.com'),
  ('oregoncapitalchronicle.com'),
  ('out.com'),
  ('outkick.com'),
  ('oxfam.org'),
  ('palmerreport.com'),
  ('panampost.com'),
  ('pastemagazine.com'),
  ('patriotnewsalerts.com'),
  ('patriotnewsdaily.com'),
  ('pbs.org'),
  ('penncapital-star.com'),
  ('people.com'),
  ('pewresearch.org'),
  ('pinknews.co.uk'),
  ('politico.com'),
  ('politifact.com'),
  ('politis.fr'),
  ('postmedia.com'),
  ('powerlineblog.com'),
  ('progressivegrocer.com'),
  ('project2025.org'),
  ('propublica.org'),
  ('publico.es'),
  ('quadrant.org.au'),
  ('rawstory.com'),
  ('readersupportednews.org'),
  ('realclearpolitics.com'),
  ('reason.com'),
  ('redstate.com'),
  ('repubblica.it'),
  ('reuters.com'),
  ('rfi.fr'),
  ('ricochet.com'),
  ('rnz.co.nz'),
  ('rt.com'),
  ('rte.ie'),
  ('rtl.fr'),
  ('sabbah.com.tr'),
  ('salon.com'),
  ('skynews.com.au'),
  ('slate.com'),
  ('snopes.com'),
  ('spectator.co.uk'),
  ('spectator.org'),
  ('spiegel.de'),
  ('sputniknews.com'),
  ('star-telegram.com'),
  ('statista.com'),
  ('sueddeutsche.de'),
  ('sun.com'),
  ('swissinfo.ch'),
  ('tagesschau.de'),
  ('taz.de'),
  ('telegraaf.nl'),
  ('telegraph.co.uk'),
  ('telerama.fr'),
  ('theatlantic.com'),
  ('theaustralian.com.au'),
  ('theblaze.com'),
  ('theconversation.com'),
  ('thedailybeast.com'),
  ('thedailystar.net'),
  ('thefederalist.com'),
  ('theglobeandmail.com'),
  ('theguardian.com'),
  ('thehill.com'),
  ('theintercept.com'),
  ('thenation.com'),
  ('therealnews.com'),
  ('therebel.media'),
  ('thestar.com'),
  ('thesun.co.uk'),
  ('thetimes.co.uk'),
  ('time.com'),
  ('today.com'),
  ('torontosun.com'),
  ('townhall.com'),
  ('truthout.org'),
  ('tvn24.pl'),
  ('unz.com'),
  ('usatoday.com'),
  ('usnews.com'),
  ('valeursactuelles.com'),
  ('vatikanet.va'),
  ('vice.com'),
  ('volkskrant.nl'),
  ('vox.com'),
  ('washingtonmonthly.com'),
  ('washingtonpost.com'),
  ('washingtontimes.com'),
  ('welt.de'),
  ('westernjournal.com'),
  ('westernjournalism.com'),
  ('wired.com'),
  ('wnd.com'),
  ('worldnetdaily.com'),
  ('wsj.com'),
  ('zerohedge.com')
on conflict (domain) do nothing;

create table if not exists public.tm_articles (
 id uuid primary key default gen_random_uuid(), canonical_url text not null unique, domain text not null, title text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.tm_article_links (
 id uuid primary key default gen_random_uuid(), article_a uuid not null references public.tm_articles(id) on delete cascade, article_b uuid not null references public.tm_articles(id) on delete cascade, created_at timestamptz not null default now(), check(article_a<>article_b), unique(article_a,article_b)
);
create table if not exists public.tm_article_excerpts (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.tm_article_links(id) on delete cascade, source_article uuid not null references public.tm_articles(id) on delete cascade, excerpt text not null check(char_length(excerpt) between 12 and 600), created_by uuid not null, created_at timestamptz not null default now()
);
create unique index if not exists tm_article_excerpt_dedupe on public.tm_article_excerpts(link_id, md5(lower(regexp_replace(excerpt,'\s+',' ','g'))));
create table if not exists public.tm_excerpt_votes (
 excerpt_id uuid not null references public.tm_article_excerpts(id) on delete cascade, client_id uuid not null, value smallint not null check(value in (-1,1)), updated_at timestamptz not null default now(), primary key(excerpt_id,client_id)
);

alter table public.tm_allowed_media enable row level security; alter table public.tm_articles enable row level security; alter table public.tm_article_links enable row level security; alter table public.tm_article_excerpts enable row level security; alter table public.tm_excerpt_votes enable row level security;
revoke all on public.tm_allowed_media,public.tm_articles,public.tm_article_links,public.tm_article_excerpts,public.tm_excerpt_votes from anon,authenticated;

create or replace function public.tm_domain(u text) returns text language sql immutable as $$ select lower(regexp_replace(split_part(split_part(u,'://',2),'/',1),'^www\.','')) $$;
create or replace function public.tm_allowed(u text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from tm_allowed_media where domain=tm_domain(u)) $$;

create or replace function public.list_article_excerpts(p_page_url text)
returns table(id uuid, other_url text, other_title text, other_domain text, excerpt text, score bigint, upvotes bigint, downvotes bigint, confirmed boolean, created_at timestamptz, created_by uuid)
language sql stable security definer set search_path=public as $$
with me as (select id from tm_articles where canonical_url=p_page_url), rows as (
 select e.id, case when l.article_a=(select id from me) then b.canonical_url else a.canonical_url end other_url, case when l.article_a=(select id from me) then b.title else a.title end other_title, case when l.article_a=(select id from me) then b.domain else a.domain end other_domain, e.excerpt,e.created_at,e.created_by
 from tm_article_links l join tm_articles a on a.id=l.article_a join tm_articles b on b.id=l.article_b join tm_article_excerpts e on e.link_id=l.id where l.article_a=(select id from me) or l.article_b=(select id from me)
), v as (select excerpt_id,count(*) filter(where value=1) up,count(*) filter(where value=-1) down,sum(value)::bigint score from tm_excerpt_votes group by excerpt_id)
select r.id,r.other_url,r.other_title,r.other_domain,r.excerpt,coalesce(v.score,0),coalesce(v.up,0),coalesce(v.down,0),(coalesce(v.score,0)>=3),r.created_at,r.created_by from rows r left join v on v.excerpt_id=r.id order by coalesce(v.score,0) desc,r.created_at desc; $$;

create or replace function public.list_pair_excerpts(p_source_url text,p_target_url text)
returns table(id uuid, excerpt text, score bigint, confirmed boolean, created_at timestamptz) language sql stable security definer set search_path=public as $$
select e.id,e.excerpt,coalesce(sum(v.value),0)::bigint,(coalesce(sum(v.value),0)>=3),e.created_at from tm_article_excerpts e join tm_article_links l on l.id=e.link_id join tm_articles a on a.id=l.article_a join tm_articles b on b.id=l.article_b left join tm_excerpt_votes v on v.excerpt_id=e.id where (a.canonical_url=p_source_url and b.canonical_url=p_target_url) or (a.canonical_url=p_target_url and b.canonical_url=p_source_url) group by e.id order by 3 desc,e.created_at desc; $$;

create or replace function public.create_article_excerpt(p_source_url text,p_source_title text,p_target_url text,p_target_title text,p_excerpt text,p_client_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare sa uuid;ta uuid;aa uuid;bb uuid;ln uuid;eid uuid; su text:=trim(p_source_url);tu text:=trim(p_target_url);ex text:=regexp_replace(trim(p_excerpt),'\s+',' ','g'); begin
 if su=tu then raise exception 'same article'; end if; if not tm_allowed(su) or not tm_allowed(tu) then raise exception 'unmanaged media'; end if; if char_length(ex)<12 or char_length(ex)>600 then raise exception 'invalid excerpt length'; end if;
 insert into tm_articles(canonical_url,domain,title) values(su,tm_domain(su),left(coalesce(p_source_title,''),500)) on conflict(canonical_url) do update set title=case when excluded.title<>'' then excluded.title else tm_articles.title end returning id into sa;
 insert into tm_articles(canonical_url,domain,title) values(tu,tm_domain(tu),left(coalesce(p_target_title,''),500)) on conflict(canonical_url) do update set title=case when excluded.title<>'' then excluded.title else tm_articles.title end returning id into ta;
 if su<tu then aa:=sa;bb:=ta;else aa:=ta;bb:=sa;end if; insert into tm_article_links(article_a,article_b) values(aa,bb) on conflict(article_a,article_b) do update set article_a=excluded.article_a returning id into ln;
 insert into tm_article_excerpts(link_id,source_article,excerpt,created_by) values(ln,ta,ex,p_client_id) returning id into eid; return eid; exception when unique_violation then raise exception 'duplicate excerpt'; end $$;

create or replace function public.delete_article_excerpt(p_excerpt_id uuid,p_client_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 delete from tm_article_excerpts where id=p_excerpt_id and created_by=p_client_id;
 if not found then raise exception 'not excerpt owner'; end if;
end $$;

create or replace function public.vote_article_excerpt(p_excerpt_id uuid,p_value integer,p_client_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin if p_value not in(-1,1) then raise exception 'invalid vote'; end if; insert into tm_excerpt_votes(excerpt_id,client_id,value) values(p_excerpt_id,p_client_id,p_value) on conflict(excerpt_id,client_id) do update set value=excluded.value,updated_at=now(); end $$;

revoke all on function public.list_article_excerpts(text) from public; revoke all on function public.list_pair_excerpts(text,text) from public; revoke all on function public.create_article_excerpt(text,text,text,text,text,uuid) from public; revoke all on function public.vote_article_excerpt(uuid,integer,uuid) from public; revoke all on function public.delete_article_excerpt(uuid,uuid) from public;

grant execute on function public.list_article_excerpts(text) to anon,authenticated; grant execute on function public.list_pair_excerpts(text,text) to anon,authenticated; grant execute on function public.create_article_excerpt(text,text,text,text,text,uuid) to anon,authenticated; grant execute on function public.vote_article_excerpt(uuid,integer,uuid) to anon,authenticated; grant execute on function public.delete_article_excerpt(uuid,uuid) to anon,authenticated;


-- V2.1.24 directional RPCs for fresh installs
-- 2minutes V2.1.24 — directional linked-article RPCs (new names to avoid stale RPC definitions)
-- Run once in Supabase SQL Editor. Safe to rerun.

create or replace function public.list_article_views_v2(p_page_url text)
returns table(
  id uuid,
  other_url text,
  other_title text,
  other_domain text,
  excerpt text,
  score bigint,
  upvotes bigint,
  downvotes bigint,
  confirmed boolean,
  created_at timestamptz,
  created_by uuid
)
language sql stable security definer set search_path=public as $$
with me as (
  select id from tm_articles where canonical_url=p_page_url limit 1
), links as (
  select
    l.id as link_id,
    case when l.article_a=(select id from me) then b.id else a.id end as other_id,
    case when l.article_a=(select id from me) then b.canonical_url else a.canonical_url end as other_url,
    case when l.article_a=(select id from me) then b.title else a.title end as other_title,
    case when l.article_a=(select id from me) then b.domain else a.domain end as other_domain,
    l.created_at as link_created_at
  from tm_article_links l
  join tm_articles a on a.id=l.article_a
  join tm_articles b on b.id=l.article_b
  where l.article_a=(select id from me) or l.article_b=(select id from me)
), votes as (
  select
    excerpt_id,
    count(*) filter(where value=1)::bigint as up,
    count(*) filter(where value=-1)::bigint as down,
    coalesce(sum(value),0)::bigint as score
  from tm_excerpt_votes
  group by excerpt_id
)
select
  e.id,
  l.other_url,
  l.other_title,
  l.other_domain,
  e.excerpt,
  coalesce(v.score,0)::bigint as score,
  coalesce(v.up,0)::bigint as upvotes,
  coalesce(v.down,0)::bigint as downvotes,
  (coalesce(v.score,0)>=3) as confirmed,
  coalesce(e.created_at,l.link_created_at) as created_at,
  e.created_by
from links l
left join tm_article_excerpts e
  on e.link_id=l.link_id
 -- IMPORTANT: viewed from article A, only excerpts whose SOURCE is article B are displayed.
 -- Viewed from B, only excerpts whose SOURCE is article A are displayed.
 and e.source_article=l.other_id
left join votes v on v.excerpt_id=e.id
order by l.other_url, coalesce(v.score,0) desc, e.created_at desc nulls last;
$$;

create or replace function public.list_pair_target_excerpts_v2(p_source_url text,p_target_url text)
returns table(id uuid, excerpt text, score bigint, confirmed boolean, created_at timestamptz)
language sql stable security definer set search_path=public as $$
with target as (
  select id from tm_articles where canonical_url=p_target_url limit 1
), pair_link as (
  select l.id
  from tm_article_links l
  join tm_articles a on a.id=l.article_a
  join tm_articles b on b.id=l.article_b
  where (a.canonical_url=p_source_url and b.canonical_url=p_target_url)
     or (a.canonical_url=p_target_url and b.canonical_url=p_source_url)
  limit 1
)
select
  e.id,
  e.excerpt,
  coalesce(sum(v.value),0)::bigint as score,
  (coalesce(sum(v.value),0)>=3) as confirmed,
  e.created_at
from tm_article_excerpts e
left join tm_excerpt_votes v on v.excerpt_id=e.id
where e.link_id=(select id from pair_link)
  and e.source_article=(select id from target)
group by e.id
order by 3 desc,e.created_at desc;
$$;

revoke all on function public.list_article_views_v2(text) from public;
revoke all on function public.list_pair_target_excerpts_v2(text,text) from public;
grant execute on function public.list_article_views_v2(text) to anon,authenticated;
grant execute on function public.list_pair_target_excerpts_v2(text,text) to anon,authenticated;
