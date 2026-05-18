/**
 * Gold Scan Engine v36
 * Brands: Kalyan, Malabar, MMTC-PAMP, Bangalore Refinery, Joyalukkas, Muthoot
 * Portals: Amazon, Flipkart, Tata CLiQ, Ajio
 * Setup: Railway Variables → SCRAPER_API_KEY = <free key from scraperapi.com>
 */
const express = require('express');
const cheerio = require('cheerio');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const HAS_PROXY       = !!SCRAPER_API_KEY;

// ─── Brands ───────────────────────────────────────────────────────────────────
const BRANDS = [
  { id:'kalyan',            name:'Kalyan Jewellers',  kw:['kalyan'] },
  { id:'malabar',           name:'Malabar Gold',       kw:['malabar'] },
  { id:'mmtcpamp',          name:'MMTC-PAMP',          kw:['mmtc','mmtc-pamp','mmtcpamp','pamp'] },
  { id:'bangalorerefinery', name:'Bangalore Refinery', kw:['bangalore refinery','bangalore ref','bgr gold'] },
  { id:'joyalukkas',        name:'Joyalukkas',         kw:['joyalukkas'] },
  { id:'muthoot',           name:'Muthoot',            kw:['muthoot'] },
];

const EXCLUDE_KW = ['silver','platinum','palladium','rhodium'];
const PRICE_RE   = /[₹]\s*[\d,]+|Rs\.?\s*[\d,]+/;

// ─── Portal URLs ──────────────────────────────────────────────────────────────
const PORTALS = [
  { id:'amazon',   name:'Amazon India',    color:'#FF9900', renderJs:true,
    urls:[
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A434730&dc&crid=2QM64MPZ6BN2I&qid=1779133573&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_nr_p_123_1&ds=v1%3ARJ1O%2FeyZ7E8fyStaMnNSWy%2F8GqEEM3efC0ke26p4gmk',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A434730&dc&page=2&xpid=ix-b_K0WsHZ_W&crid=2QM64MPZ6BN2I&qid=1779133580&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_pg_2',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A358856&dc&crid=2QM64MPZ6BN2I&qid=1779133598&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_nr_p_123_2&ds=v1%3AN%2By%2BTw4FHdnwN9zw20qcEGIVTDHVFlYEZbMvBvjJXIw',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A484217&dc&crid=2QM64MPZ6BN2I&qid=1779133610&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_nr_p_123_3&ds=v1%3A9dSJoVcO8GptN%2Btv0l5XS%2FaDFVWz4Tk2lWl24cZ7nQc',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A484790&dc&crid=2QM64MPZ6BN2I&qid=1779133649&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_nr_p_123_4&ds=v1%3AV6F394yApw4P121q22ZinuVDws7tfxDCyzBOVgSSOqU',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A484790&dc&page=2&xpid=OGxW-nxdHh8On&crid=2QM64MPZ6BN2I&qid=1779133653&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_pg_2',
      'https://www.amazon.in/s?k=Gold+coin+bar&rh=p_123%3A6408233&dc&crid=2QM64MPZ6BN2I&qid=1779133716&rnid=91049095031&sprefix=gold+coin+ba%2Caps%2C340&ref=sr_nr_p_123_1&ds=v1%3AeUbxwlKiSqKW9SM%2F3f5ewu0hiicuMc3bGExeUGzzXzw',
      'https://www.amazon.in/s?k=Gold+coin+bar+muthoot&rh=p_123%3A4754335&dc&crid=3EU2C5OY51FB3&qid=1779133732&rnid=91049095031&sprefix=gold+coin+bar+muth%2Caps%2C357&ref=sr_nr_p_123_5&ds=v1%3Amk780bI%2FtrYNJfKlIcZTW%2BBM9Uep%2BtfI5AJ0bRQbZV4',
    ]},
  { id:'flipkart', name:'Flipkart',        color:'#2874F0', renderJs:true,
    urls:[
      'https://www.flipkart.com/search?q=Gold+coin&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&p%5B%5D=facets.brand%255B%255D%3DBangalore%2BRefinery&sort=price_desc',
      'https://www.flipkart.com/search?q=Gold+coin&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&sort=price_desc&p%5B%5D=facets.brand%255B%255D%3DMMTC-PAMP%2BIndia%2BPvt%2BLtd',
      'https://www.flipkart.com/search?q=Gold+coin&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&sort=price_desc&p%5B%5D=facets.brand%255B%255D%3DJoyalukkas',
    ]},
  { id:'tatacliq', name:'Tata CLiQ Luxury',color:'#E40046', renderJs:true,
    urls:[
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B11294',
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B10320',
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B26926',
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B10147',
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B14000',
      'https://www.tatacliq.com/search?q=coins%2C+bars%2C+stones-gold%3Arelevance%3Alist%3AlistId_9b76631e219841459f507c6d3c376cc6%3AinStockFlag%3Atrue%3Abrand%3AMBH19B27254',
    ]},
  { id:'ajio',    name:'Ajio',            color:'#E31837', renderJs:true,
    urls:[
      'https://www.ajio.com/search/?query=%3Arelevance%3Abrand%3AKALYAN%20JEWELLERS&text=gold%20coin&classifier=intent&customerType=Existing&gridColumns=3&segmentIds=&customertype=Existing',
      'https://www.ajio.com/search/?query=%3Arelevance%3Abrand%3AMuthoot%20PAPPACHAN&text=gold%20coin&classifier=intent&customerType=Existing&gridColumns=3&segmentIds=&customertype=Existing',
      'https://www.ajio.com/search/?query=%3Arelevance%3Abrand%3ABangalore%20Refinery&text=gold%20coin&classifier=intent&customerType=Existing&gridColumns=3',
      'https://www.ajio.com/search/?query=%3Arelevance%3Abrand%3AMalabar%20Gold%20%26%20Diamonds&text=gold%20coin&classifier=intent&customerType=Existing&gridColumns=3&segmentIds=&customertype=Existing',
      'https://www.ajio.com/search/?query=%3Arelevance%3Abrand%3AMmtc%20Pamp&text=gold%20coin&classifier=intent&customerType=Existing&gridColumns=3&segmentIds=&customertype=Existing',
    ]},
];

const PORTAL_WAIT = { tatacliq:6000, ajio:6000, flipkart:5000 };

console.log(`\n🪙  Gold Scan Engine v36`);
console.log(`    Proxy : ${HAS_PROXY ? '✓ ScraperAPI' : '✗ not set'}`);
console.log(`    Port  : ${PORT}\n`);

// ─── HTTP ─────────────────────────────────────────────────────────────────────
const INDIA_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function fetchHtml(url, renderJs=true, wait=0) {
  let fetchUrl, headers;
  if (HAS_PROXY) {
    fetchUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&country_code=in&render=${renderJs}&device_type=desktop${wait>0?`&wait=${wait}`:''}`;
    headers  = {};
  } else {
    fetchUrl = url; headers = { ...INDIA_HEADERS };
  }
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(fetchUrl, { headers, signal:ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally { clearTimeout(timer); }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function matchBrand(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  return BRANDS.find(b => b.kw.some(kw => t.includes(kw))) || null;
}
function parsePrice(raw) {
  const n = parseFloat(String(raw||'').replace(/[₹,\s]/g,''));
  return isNaN(n) || n < 100 ? null : n;
}
function extractWeight(text) {
  if (!text) return null;
  const t = String(text);
  const kg = t.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kg) { const g=parseFloat(kg[1])*1000; if(g>=0.5&&g<=500) return {grams:g,label:`${g}g`}; }
  const gm = t.match(/(\d+(?:\.\d+)?)\s*[-–]?\s*g(?:rams?|m)?\b/i);
  if (gm) { const v=parseFloat(gm[1]); if(v>=0.5&&v<=500) return {grams:v,label:`${v}g`}; }
  return null;
}
const isExcluded = t => EXCLUDE_KW.some(kw => String(t||'').toLowerCase().includes(kw));


function detectPurity(text) {
  const t = String(text||'').toLowerCase();
  if (/24\s*k(?:t|arat)?|24\s*kt|999\.9|999 purity|999 gold/.test(t)) return '24K';
  if (/22\s*k(?:t|arat)?|22\s*kt|916/.test(t)) return '22K';
  return '—';
}

function makeItem(title, full, matched, price, mrp, url, image, weight, offers) {
  if (isExcluded(title)) return null;  // only check title, not full card text (avoids false positives from sidebars)
  const brand = matched || { id:'other', name:'Other' };
  const w = weight || extractWeight(title) || extractWeight(full) || null;
  return {
    title, brand:brand.name, brandId:brand.id, purity:detectPurity(title+' '+full),
    weight:w?w.grams:null, weightLabel:w?w.label:'—',
    price, mrp:mrp||null, effectivePrice:price,
    pricePerGram:w?+(price/w.grams).toFixed(2):null,
    url, image:image||'', offers:offers||[],
  };
}

function dedupKey(item, portalId) {
  const slug = String(item.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30);
  return `${portalId}::${slug||item.brandId}::${Math.round(item.price)}`;
}

function offerLines(text) {
  return text.split('\n').map(l=>l.trim()).filter(l=>
    l.length>4&&l.length<150&&
    /bank offer|coupon|cashback|off on|save|hdfc|sbi|icici|axis|kotak|emi|credit card|\d+%.*off|flat.*off/i.test(l)
  ).slice(0,3);
}

// ─── DOM ancestor helper ──────────────────────────────────────────────────────
function isDescendantOf(child, ancestor) {
  let p = child.parent;
  while (p) { if (p === ancestor) return true; p = p.parent; }
  return false;
}

// ─── Price-anchor card finder ─────────────────────────────────────────────────
function findProductCards($) {
  const leafPrices = $('*').toArray().filter(el => {
    const txt = $(el).text().trim();
    if (!PRICE_RE.test(txt) || txt.length > 200) return false;
    return !$(el).children().toArray().some(c => PRICE_RE.test($(c).text()));
  });
  const leafSet = new Set(leafPrices), cardsSeen = new Set(), cards = [];
  for (const priceEl of leafPrices) {
    let el = priceEl.parent;
    for (let d = 0; d < 25 && el && el.type === 'tag'; d++) {
      const $el = $(el), text = $el.text() || '';
      if (text.length < 10 || text.length > 20000 || $el.find('a[href]').length === 0) { el=el.parent; continue; }
      const innerCount = $el.find('*').toArray().filter(e => leafSet.has(e)).length;
      if (innerCount >= 1 && innerCount <= 4) {
        if (!cardsSeen.has(el)) { cardsSeen.add(el); cards.push(el); }
        break;
      }
      el = el.parent;
    }
  }
  return cards;
}

// ─── Amazon parser ────────────────────────────────────────────────────────────
function parseAmazon($) {
  const results=[], seen=new Set();
  $('[data-component-type="s-search-result"]').each((_,card)=>{
    try{
      const $c=$(card), full=$c.text()||'';
      const title=$c.find('h2 span,h2 a span').first().text().trim(); if(!title) return;
      const matched=matchBrand(title)||matchBrand(full);
      let price=parsePrice($c.find('.a-price .a-offscreen').first().text());
      if(!price){const w=$c.find('.a-price-whole').first().text().replace(/\D/g,'');const f=$c.find('.a-price-fraction').first().text().replace(/\D/g,'');if(w)price=parsePrice(w+(f?'.'+f:''));}
      if(!price) return;
      const mrp=parsePrice($c.find('.a-text-price .a-offscreen').first().text());
      let url=$c.find('h2 a,a[href*="/dp/"]').first().attr('href')||'';
      if(url&&!url.startsWith('http')) url='https://www.amazon.in'+url;
      const item=makeItem(title,full,matched,price,mrp,url,$c.find('img.s-image').first().attr('src')||'',null,offerLines(full));
      if(!item) return;
      const key=dedupKey(item,'amazon'); if(seen.has(key)) return; seen.add(key);
      results.push({...item,portal:'amazon',portalName:'Amazon India',portalColor:'#FF9900'});
    }catch(_){}
  });
  console.log(`  [amazon] ${results.length} items`);
  return results;
}

// ─── Flipkart parser ──────────────────────────────────────────────────────────
function parseFlipkart($) {
  const results=[], seen=new Set(), cardSet=new Set();
  $('a[href*="/p/"],a[href*="/dp/"]').each((_,a)=>{
    let el=$(a).parent()[0];
    for(let d=0;d<10&&el;d++){
      const t=$(el).text()||'';
      if(t.length>20&&t.length<15000&&PRICE_RE.test(t)){cardSet.add(el);break;}
      el=$(el).parent()[0];
    }
  });
  $('[data-id]').each((_,el)=>{
    const t=$(el).text()||'';
    if(t.length>20&&t.length<15000&&PRICE_RE.test(t)) cardSet.add(el);
  });
  const all=[...cardSet],leaves=all.filter(c=>!all.some(o=>o!==c&&isDescendantOf(c,o)));
  for(const card of leaves){
    try{
      const $c=$(card),full=$c.text()||'';
      const matched=matchBrand(full);
      const title=$c.find('a[href*="/p/"]').first().text().trim()||full.split('\n').find(l=>l.trim().length>5)||'';
      let price=parsePrice($c.find('[class*="price"],[class*="Price"]').first().text());
      if(!price){const m=full.match(/₹\s*([\d,]+)/);if(m)price=parseFloat(m[1].replace(/,/g,''));}
      if(!price) continue;
      const mrp=parsePrice($c.find('s,del,[class*="mrp"],[class*="original"],[class*="strike"]').first().text());
      let url=$c.find('a[href*="/p/"]').first().attr('href')||'';
      if(url&&!url.startsWith('http')) url='https://www.flipkart.com'+url;
      const item=makeItem(title,full,matched,price,mrp,url,$c.find('img').first().attr('src')||'',null,offerLines(full));
      if(!item) continue;
      const key=dedupKey(item,'flipkart'); if(seen.has(key)) continue; seen.add(key);
      results.push({...item,portal:'flipkart',portalName:'Flipkart',portalColor:'#2874F0'});
    }catch(_){}
  }
  if(!results.length){
    // Generic price-anchor fallback
    const cards=findProductCards($);
    for(const card of cards){
      try{
        const $c=$(card),full=$c.text()||'';
          const matched=matchBrand(full);
        const title=$c.find('h2,h3,h4,[class*="name"],[class*="title"]').first().text().trim()||full.split('\n').find(l=>l.trim().length>5)||'';
        let price=parsePrice($c.find('[class*="price"],[class*="Price"]').first().text());
        if(!price){const m=full.match(/₹\s*([\d,]+)/);if(m)price=parseFloat(m[1].replace(/,/g,''));}
        if(!price) continue;
        const mrp=parsePrice($c.find('s,del,[class*="mrp"]').first().text());
        let url=$c.find('a[href]').first().attr('href')||'';
        if(url&&!url.startsWith('http')) url='https://www.flipkart.com'+url;
        const item=makeItem(title,full,matched,price,mrp,url,$c.find('img').first().attr('src')||'',null,offerLines(full));
        if(!item) continue;
        const key=dedupKey(item,'flipkart'); if(seen.has(key)) continue; seen.add(key);
        results.push({...item,portal:'flipkart',portalName:'Flipkart',portalColor:'#2874F0'});
      }catch(_){}
    }
  }
  console.log(`  [flipkart] ${results.length} items`);
  return results;
}

// ─── Tata CLiQ parser ─────────────────────────────────────────────────────────
function parseTataCliq($) {
  const BASE='https://www.tatacliq.com', results=[], seen=new Set();

  // Strategy 1: __NEXT_DATA__ JSON (Next.js embeds full page state)
  try {
    const nd = $('script#__NEXT_DATA__').html()||'';
    if (nd && nd.length > 100) {
      const nameRe = /"(?:productName|name|title|displayName)"\s*:\s*"([^"]{3,200})"/g;
      let nm;
      while ((nm=nameRe.exec(nd)) !== null) {
        const title = nm[1];
        if (isExcluded(title)) continue;
        const matched = matchBrand(title);
        const nearby  = nd.slice(Math.max(0,nm.index-200), nm.index+800);
        const pm = nearby.match(/"(?:sellingPrice|price|discountedPrice|mrp|offerPrice)"\s*:\s*([\d.]+)/);
        if (!pm) continue;
        const price = parseFloat(pm[1]); if (!price||price<100) continue;
        const mrpM  = nearby.match(/"(?:mrp|originalPrice|listPrice)"\s*:\s*([\d.]+)/);
        const mrp   = mrpM ? parseFloat(mrpM[1]) : null;
        const urlM  = nearby.match(/"(?:pdpUrl|url|canonicalUrl|slug)"\s*:\s*"(\/[^"]{5,200})"/);
        const imgM  = nearby.match(/"(?:imageURL|imageUrl|image|thumbnail)"\s*:\s*"(https?:[^"]{10,})"/);
        const url   = urlM ? BASE+urlM[1] : '';
        const item  = makeItem(title, title, matched, price, mrp, url, imgM?imgM[1]:'', null, []);
        if (!item) continue;
        const key = dedupKey(item,'tatacliq');
        if (seen.has(key)) continue; seen.add(key);
        results.push({...item,portal:'tatacliq',portalName:'Tata CLiQ Luxury',portalColor:'#E40046'});
      }
      if (results.length > 0) { console.log(`  [tatacliq] __NEXT_DATA__: ${results.length}`); return results; }
    }
  } catch(e) { console.warn('  [tatacliq] __NEXT_DATA__ err:', e.message); }

  // Strategy 2: link-anchor on /p- product links
  const cardSet = new Set();
  $('a[href*="/p-"],a[href*="/mp-"]').each((_,a)=>{
    let el=$(a).parent()[0];
    for(let d=0;d<15&&el;d++){
      const t=$(el).text()||'';
      if(t.length>20&&t.length<12000&&PRICE_RE.test(t)){cardSet.add(el);break;}
      el=$(el).parent()[0];
    }
  });
  // Strategy 3: explicit class selectors
  $('[class*="ProductCard"],[class*="productCard"],[class*="product-card"],[class*="ProductTile"],[class*="plp-product"],[class*="SearchResultCard"],[class*="GridCard"],[class*="productBase"],[data-id]').each((_,el)=>{
    const t=$(el).text()||'';
    if(t.length>20&&t.length<12000&&PRICE_RE.test(t)) cardSet.add(el);
  });
  // Strategy 4: price-anchor fallback
  findProductCards($).forEach(el => cardSet.add(el));

  const all=[...cardSet], leaves=all.filter(c=>!all.some(o=>o!==c&&isDescendantOf(c,o)));
  for(const card of leaves){
    try{
      const $c=$(card),full=$c.text()||'';
      const matched=matchBrand(full);
      const titleEl=$c.find('h2,h3,h4,[class*="title"],[class*="Title"],[class*="name"],[class*="Name"],[class*="desc"],[class*="product"]').first();
      const title=titleEl.text().trim()||full.split('\n').map(l=>l.trim()).find(l=>l.length>5)||'';
      const priceEl=$c.find('[class*="price"],[class*="Price"],[class*="rate"],[class*="selling"]').first();
      let price=parsePrice(priceEl.text());
      if(!price){const m=full.match(/₹\s*([\d,]+(?:\.\d+)?)/);if(m)price=parseFloat(m[1].replace(/,/g,''));}
      if(!price) continue;
      const mrp=parsePrice($c.find('s,del,[class*="mrp"],[class*="original"],[class*="strike"],[class*="through"]').first().text());
      const linkEl=$c.find('a[href*="/p-"],a[href*="/mp-"],a[href]').first();
      let url=linkEl.attr('href')||'';
      if(url&&!url.startsWith('http')) url=BASE+url;
      const item=makeItem(title,full,matched,price,mrp,url,$c.find('img').first().attr('src')||'',null,offerLines(full));
      if(!item) continue;
      const key=dedupKey(item,'tatacliq'); if(seen.has(key)) continue; seen.add(key);
      results.push({...item,portal:'tatacliq',portalName:'Tata CLiQ Luxury',portalColor:'#E40046'});
    }catch(_){}
  }
  console.log(`  [tatacliq] cardSet=${cardSet.size} leaves=${leaves.length} items=${results.length}`);
  return results;
}

// ─── Ajio parser ───────────────────────────────────────────────────────────────
function parseAjio($) {
  const BASE='https://www.ajio.com', results=[], seen=new Set(), cardSet=new Set();
  $('a[href*="/p/"],a[href*="/dp/"]').each((_,a)=>{
    let el=$(a).parent()[0];
    for(let d=0;d<12&&el;d++){
      const t=$(el).text()||'';
      if(t.length>20&&t.length<10000&&PRICE_RE.test(t)){cardSet.add(el);break;}
      el=$(el).parent()[0];
    }
  });
  $('[class*="item-box"],[class*="plp-card"],[class*="rilrtl-item"],[class*="product-tile"],[class*="plp-product"],[class*="productcard"],[class*="product-item"],[data-prodid],[data-product-id]').each((_,el)=>{
    const t=$(el).text()||'';
    if(t.length>20&&t.length<10000&&PRICE_RE.test(t)) cardSet.add(el);
  });
  findProductCards($).forEach(el => cardSet.add(el));
  const all=[...cardSet],leaves=all.filter(c=>!all.some(o=>o!==c&&isDescendantOf(c,o)));
  for(const card of leaves){
    try{
      const $c=$(card),full=$c.text()||'';
      const matched=matchBrand(full);
      const titleEl=$c.find('h2,h3,h4,[class*="title"],[class*="Title"],[class*="name"],[class*="Name"],[class*="brand"],[class*="Brand"]').first();
      const title=titleEl.text().trim()||full.split('\n').map(l=>l.trim()).find(l=>l.length>5)||'';
      const priceEl=$c.find('[class*="price"],[class*="Price"],[class*="rate"],[class*="amount"]').first();
      let price=parsePrice(priceEl.text());
      if(!price){const m=full.match(/₹\s*([\d,]+(?:\.\d+)?)/);if(m)price=parseFloat(m[1].replace(/,/g,''));}
      if(!price) continue;
      const mrp=parsePrice($c.find('s,del,[class*="mrp"],[class*="original"],[class*="strike"]').first().text());
      const linkEl=$c.find('a[href*="/p/"],a[href]').first();
      let url=linkEl.attr('href')||'';
      if(url&&!url.startsWith('http')) url=BASE+url;
      const item=makeItem(title,full,matched,price,mrp,url,$c.find('img').first().attr('src')||'',null,offerLines(full));
      if(!item) continue;
      const key=dedupKey(item,'ajio'); if(seen.has(key)) continue; seen.add(key);
      results.push({...item,portal:'ajio',portalName:'Ajio',portalColor:'#E31837'});
    }catch(_){}
  }
  console.log(`  [ajio] cardSet=${cardSet.size} leaves=${leaves.length} items=${results.length}`);
  return results;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function parseHtml(portalId, $) {
  switch(portalId) {
    case 'amazon':   return parseAmazon($);
    case 'flipkart': return parseFlipkart($);
    case 'tatacliq': return parseTataCliq($);
    case 'ajio':     return parseAjio($);
    default: return [];
  }
}

// ─── Scrape URL ───────────────────────────────────────────────────────────────
async function scrapeUrl(portal, url) {
  const renderJs = portal.renderJs !== false;
  const wait     = PORTAL_WAIT[portal.id] || 0;
  const html     = await fetchHtml(url, renderJs, wait);
  const $        = cheerio.load(html);
  const title    = $('title').text();
  const prices   = (html.match(/₹/g)||[]).length;
  console.log(`  [${portal.name}] "${title.slice(0,50)}" | ₹×${prices} | ${html.length}b`);
  if(prices===0) console.warn(`  ⚠  [${portal.name}] ZERO ₹ signs — page may be blocked`);
  if(/captcha|robot|verify|unusual traffic/i.test(title)) throw new Error(`Blocked: ${title.slice(0,40)}`);
  return parseHtml(portal.id, $);
}

// ─── Scrape portal ────────────────────────────────────────────────────────────
async function scrapePortal(portal) {
  const seen=new Set(), results=[];
  for(const url of portal.urls){
    try{
      const items=await scrapeUrl(portal,url);
      results.push(...items);
    }catch(err){ console.warn(`  [${portal.name}] ${err.message}`); }
  }
  console.log(`[scan] ${portal.name} → ${results.length} items\n`);
  return results;
}

// ─── SSE /api/scan ────────────────────────────────────────────────────────────
app.get('/api/scan', async(req,res)=>{
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.flushHeaders();
  const send=(t,d)=>{try{res.write(`data: ${JSON.stringify({type:t,...d})}\n\n`);}catch(_){}};
  const ping=setInterval(()=>{try{res.write(': ping\n\n');}catch(_){}},15000);
  try{
    if(!HAS_PROXY) send('warning',{message:'No SCRAPER_API_KEY — visit /setup'});
    PORTALS.forEach((p,i)=>send('progress',{portal:p.name,portalId:p.id,portalColor:p.color,progress:i/PORTALS.length,message:`Scanning ${p.name}…`}));
    await Promise.allSettled(PORTALS.map(async portal=>{
      try{
        const items=await scrapePortal(portal);
        send('portal_done',{portalId:portal.id,portalName:portal.name,portalColor:portal.color,count:items.length,items});
      }catch(err){
        send('portal_error',{portalId:portal.id,portalName:portal.name,portalColor:portal.color,error:err.message});
      }
    }));
    send('done',{});
  }catch(err){send('error',{message:err.message});}
  finally{clearInterval(ping);res.end();}
});

app.get('/api/test', async(_,res)=>{
  const url='https://www.amazon.in/s?k=MMTC+PAMP+gold+coin';
  try{
    const html=await fetchHtml(url,true);
    const $=cheerio.load(html);
    const items=parseAmazon($);
    res.json({ok:true,title:$('title').text(),itemCount:items.length,proxy:HAS_PROXY});
  }catch(err){res.json({ok:false,error:err.message,proxy:HAS_PROXY});}
});

app.get('/setup',(_,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Setup</title>
<style>body{font-family:sans-serif;background:#111;color:#eee;padding:20px;max-width:500px;margin:0 auto}
h1{color:#D4AA2A}.card{background:#1F2937;border-radius:10px;padding:18px;margin:12px 0}
code{background:#374151;padding:2px 7px;border-radius:4px}a{color:#93C5FD}
.ok{background:#064E3B;color:#6EE7B7;padding:10px;border-radius:8px;margin:10px 0}
.warn{background:#7F1D1D;color:#FCA5A5;padding:10px;border-radius:8px;margin:10px 0}</style>
</head><body><h1>🪙 Setup</h1>
<div class="${HAS_PROXY?'ok':'warn'}">${HAS_PROXY?'✓ ScraperAPI key is set!':'✗ SCRAPER_API_KEY not set'}</div>
<div class="card"><b>3 steps (free, no credit card):</b><br><br>
1. Sign up at <a href="https://www.scraperapi.com" target="_blank">scraperapi.com</a><br>
2. Copy your API key<br>
3. Railway → Variables → <code>SCRAPER_API_KEY</code> = your key → Save</div>
<p><a href="/">← App</a> | <a href="/api/test">Test</a></p></body></html>`));

app.get('/health',(_,res)=>res.json({ok:true,proxy:HAS_PROXY}));
app.listen(PORT,'0.0.0.0',()=>console.log(`🪙  Gold Scan Engine → http://localhost:${PORT}\n`));
