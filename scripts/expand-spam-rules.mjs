// Curated phrase families. Run with: node scripts/expand-spam-rules.mjs
// Each row: weight | suggested alternative | six distinct phrases.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../packages/app/data/spam-rules.json', import.meta.url)
const catalog = JSON.parse(readFileSync(path, 'utf8'))
const families = {
  urgency: `
18|please reply when convenient|reply within one hour;respond within one hour;reply in the next hour;respond in the next hour;answer within one hour;answer in the next hour
18|please review when convenient|open this email immediately;read this email immediately;open this message immediately;read this message immediately;review this email immediately;review this message immediately
16|current availability|only a few spots left;only a handful of spots left;only a few places left;only a handful of places left;just a few spots remain;just a few places remain
16|current availability|offer ends at midnight;deal ends at midnight;promotion ends at midnight;price expires at midnight;discount ends at midnight;access ends at midnight
16|please respond if interested|respond before midnight;reply before midnight;confirm before midnight;answer before midnight;act before midnight;sign up before midnight
15|when convenient|don't wait any longer;do not wait any longer;don't delay your response;do not delay your response;stop waiting and act;stop waiting and reply
17|current terms|today only special;today only pricing;today only discount;today only access;today only offer;today only deal
16|upcoming deadline|deadline is tonight;deadline is this evening;deadline is tomorrow morning;deadline closes tonight;deadline closes this evening;deadline closes tomorrow morning
18|please review the details|you must act today;you must respond today;you must reply today;you must sign up today;you must decide today;you must confirm today
18|please review when convenient|immediate action required;immediate response required;immediate reply required;immediate confirmation required;immediate decision required;immediate payment required
15|available while capacity lasts|while supplies last;while stock lasts;before stock runs out;before supplies run out;until inventory runs out;until stock runs out
16|current enrollment window|enrollment closes tonight;registration closes tonight;signups close tonight;applications close tonight;enrollment closes tomorrow;registration closes tomorrow
18|follow-up reminder|your final reminder;your last reminder;your final warning;your last warning;final warning today;last warning today
17|if this is useful|don't miss this opportunity;do not miss this opportunity;don't miss this deal;do not miss this deal;don't miss this offer;do not miss this offer
14|current price|price goes up tomorrow;pricing goes up tomorrow;rate goes up tomorrow;cost goes up tomorrow;price increases tonight;pricing increases tonight
18|please respond when you can|respond right away;reply right away;answer right away;confirm right away;sign up right away;buy right away
`,
  financial_money: `
22|pricing details|claim your cash reward;claim your cash bonus;claim your money reward;claim your cash prize;claim your payment reward;claim your payment bonus
24|revenue opportunity|earn thousands overnight;make thousands overnight;earn hundreds overnight;make hundreds overnight;earn a fortune overnight;make a fortune overnight
22|potential revenue growth|double your profits fast;triple your profits fast;double your revenue fast;triple your revenue fast;double your earnings fast;triple your earnings fast
18|available pricing|unbeatable discount today;unbeatable price today;unbeatable deal today;unbeatable offer today;unbeatable savings today;unbeatable value today
18|pricing available on request|lowest price guaranteed;cheapest price guaranteed;best price guaranteed;lowest rate guaranteed;cheapest rate guaranteed;best rate guaranteed
20|an available incentive|instant cash bonus;immediate cash bonus;instant signup bonus;immediate signup bonus;instant joining bonus;immediate joining bonus
22|review the terms|no credit check required;no income check required;no documentation required;no verification required;no approval required;no application required
22|review the financial details|riskless investment return;guaranteed investment return;assured investment return;certain investment return;fixed investment return;instant investment return
20|potential savings|save thousands instantly;save hundreds instantly;save a fortune instantly;save thousands overnight;save hundreds overnight;save a fortune overnight
20|review the offer terms|zero cost forever;free forever guaranteed;completely free forever;absolutely free forever;totally free forever;forever free guaranteed
20|pricing information|massive discount available;huge discount available;enormous discount available;unbelievable discount available;incredible discount available;extraordinary discount available
24|review the compensation details|earn cash from home;make cash from home;earn money from home fast;make money from home fast;earn income from home fast;make income from home fast
20|review the offer|cash waiting for you;money waiting for you;payment waiting for you;bonus waiting for you;reward waiting for you;prize waiting for you
22|review the offer details|receive free cash today;get free cash today;collect free cash today;claim free cash today;receive free money today;get free money today
18|estimated return|guaranteed monthly profit;guaranteed weekly profit;guaranteed daily profit;guaranteed annual profit;guaranteed passive profit;guaranteed recurring profit
18|cost information|no payment ever needed;no fee ever needed;no charge ever needed;no cost ever incurred;no expense ever incurred;no money ever required
`,
  shady_phishing: `
28|contact the organization through its official website|send your password now;share your password now;reply with your password;email your password here;provide your password now;confirm your password here
28|use the official account portal|verify your account immediately;verify your identity immediately;confirm your login immediately;confirm your account immediately;update your password immediately;reset your password immediately
26|contact your provider directly|your account will be suspended;your account will be locked;your account will be terminated;your account will be closed;your account will be disabled;your account will be deleted
26|contact the organization directly|your payment has failed;your payment was rejected;your payment is overdue;your invoice is overdue;your billing is suspended;your card has been declined
28|review through an official channel|download the attached invoice now;open the attached invoice now;download the attached receipt now;open the attached receipt now;download the attached statement now;open the attached statement now
28|contact the sender through a verified channel|send your security code;share your security code;reply with your security code;provide your security code;confirm your security code;enter your security code here
28|contact the sender through a verified channel|send your one-time code;share your one-time code;reply with your one-time code;provide your one-time code;confirm your one-time code;enter your one-time code here
26|review the sender and destination|click to avoid suspension;click to avoid termination;click to avoid account closure;click to prevent suspension;click to prevent termination;click to prevent account closure
24|review the sender and destination|secure your account now;restore your account now;unlock your account now;reactivate your account now;recover your account now;protect your account now
24|contact support through the official site|your mailbox is full;your inbox has expired;your email account has expired;your mailbox has been suspended;your inbox has been suspended;your email account has been suspended
24|contact the sender through an official channel|we detected suspicious activity;we noticed suspicious activity;we found suspicious activity;we identified suspicious activity;we detected unauthorized activity;we noticed unauthorized activity
25|review the terms through an official channel|claim your unclaimed funds;collect your unclaimed funds;release your unclaimed funds;claim your unclaimed payment;collect your unclaimed payment;release your unclaimed payment
25|contact the sender through an official channel|you have inherited money;you inherited a fortune;you are the sole beneficiary;you are a selected beneficiary;your inheritance is ready;your inheritance is waiting
24|verify the sender independently|confidential business proposal;secret financial proposal;private wealth opportunity;confidential investment proposal;secret investment proposal;private inheritance opportunity
27|never share credentials by email|provide your login credentials;send your login credentials;share your login credentials;confirm your login credentials;email your login credentials;reply with your login credentials
26|use the official website directly|sign in through this link;log in through this link;login through this link;access your account through this link;verify your account through this link;confirm your identity through this link
`,
  overpromising: `
22|results may vary|guaranteed success overnight;guaranteed growth overnight;guaranteed sales overnight;guaranteed revenue overnight;guaranteed profit overnight;guaranteed results overnight
20|potential improvement|transform your business instantly;transform your sales instantly;transform your revenue instantly;transform your workflow instantly;transform your marketing instantly;transform your pipeline instantly
20|practical improvements|effortless growth guaranteed;effortless sales guaranteed;effortless profits guaranteed;effortless revenue guaranteed;effortless leads guaranteed;effortless success guaranteed
20|review the evidence|scientifically proven to work for everyone;proven to work for everyone;guaranteed to work for everyone;certain to work for everyone;tested to work for everyone;verified to work for everyone
18|possible improvement|increase conversions by 100%;increase sales by 100%;increase revenue by 100%;increase profits by 100%;increase leads by 100%;increase replies by 100%
18|possible improvement|boost conversions tenfold;boost sales tenfold;boost revenue tenfold;boost profits tenfold;boost leads tenfold;boost replies tenfold
20|review the evidence|zero effort required for success;zero effort required for growth;zero effort required for profit;zero effort required for sales;zero effort required for leads;zero effort required for revenue
20|review the claim|works every single time;delivers every single time;succeeds every single time;converts every single time;performs every single time;wins every single time
19|realistic expected outcomes|instant business transformation;instant sales transformation;instant revenue transformation;instant workflow transformation;instant marketing transformation;instant pipeline transformation
18|review the results|everyone gets results;everyone sees results;everyone makes money;everyone closes deals;everyone increases sales;everyone grows revenue
20|review the evidence|never fails to deliver;never fails to convert;never fails to perform;never fails to succeed;never fails to generate leads;never fails to increase sales
20|review the claim|perfect results every time;perfect sales every time;perfect growth every time;perfect conversions every time;perfect performance every time;perfect outcomes every time
19|practical business outcomes|revolutionary sales breakthrough;revolutionary marketing breakthrough;revolutionary revenue breakthrough;revolutionary lead generation breakthrough;revolutionary workflow breakthrough;revolutionary growth breakthrough
20|review the evidence|proven to double sales overnight;proven to double revenue overnight;proven to double leads overnight;proven to triple sales overnight;proven to triple revenue overnight;proven to triple leads overnight
18|measurable improvements|unstoppable business growth;unstoppable sales growth;unstoppable revenue growth;unstoppable profit growth;unstoppable lead growth;unstoppable conversion growth
20|review the evidence|the ultimate solution for everyone;the perfect solution for everyone;the only solution you need;the last solution you need;the best solution for everyone;the definitive solution for everyone
`,
}

const existing = new Set(catalog.triggers.map((item) => item.phrase.toLowerCase()))
let added = 0
for (const [category, source] of Object.entries(families)) {
  for (const line of source.trim().split('\n')) {
    const [weightText, replacement, list] = line.trim().split('|')
    if (!weightText || !replacement || !list) throw new Error(`Invalid rule family: ${line}`)
    const weight = Number(weightText)
    for (const phrase of list.split(';').map((value) => value.trim().toLowerCase())) {
      if (existing.has(phrase)) {
        if (category === 'shady_phishing') {
          const rule = catalog.triggers.find((item) => item.phrase.toLowerCase() === phrase)
          if (rule) rule.manualReview = true
        }
        continue
      }
      if (phrase.split(/\s+/).length < 2) throw new Error(`Overly broad new phrase: ${phrase}`)
      catalog.triggers.push({ phrase, category, weight, replacement, ...(category === 'shady_phishing' ? { manualReview: true } : {}) })
      existing.add(phrase)
      added++
    }
  }
}
writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
console.log(`Added ${added} distinct phrases. Catalog now has ${catalog.triggers.length} rules.`)
