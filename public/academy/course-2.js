// Module 2: Quality
(function () {
  var SUB = "https://torghattencapital.substack.com/p/";
  window.COURSE.modules.push({
    slug: "quality",
    title: "Quality",
    heading: "What makes a business <em>worth owning?</em>",
    summary: "Return on invested capital, growth in free cash flow per share, and how to judge a moat with Porter and Helmer.",
    minutes: 75,
    objectives: [
      "Calculate return on invested capital and know when to include goodwill",
      "Explain why growth is only worth something when returns are high",
      "Name the one force that decides profits in an industry",
      "Test a moat for both benefit and barrier, and classify it as wide, narrow or none"
    ],
    lessons: [
      {
        title: "Two numbers that do most of the work",
        html:
          "<p>The Strategy Book describes what Torghatten Capital looks for in one sentence:</p>" +
          "<blockquote>Global companies with a high, long-lasting return on invested capital (ROIC) above 15%, and high normalised growth in free cash flow per share above 10% a year.</blockquote>" +
          "<p>Two numbers. Everything else in this module is about understanding why those two matter, and how to tell whether they’ll last.</p>" +
          "<h5>Return on invested capital</h5>" +
          "<p>ROIC answers a simple question: for every krone tied up in the business, how much profit does it earn each year? It’s the after-tax operating profit divided by the capital it took to produce it.</p>" +
          '<div class="box"><b class="t">The formula</b>ROIC = operating profit (EBIT) x (1 − tax rate) / invested capital<br><br>Invested capital is roughly equity plus net debt, or the operating assets the business needs to run: property, equipment, working capital and, for acquirers, goodwill.</div>' +
          "<p>A company with 15% ROIC turns 100 kroner of capital into 15 kroner of profit a year. One with 40% turns it into 40. The second business can grow much faster on the same money, or pay much more out while growing at the same speed. You’ll see exactly how much in the next lesson.</p>" +
          "<h5>The goodwill question</h5>" +
          "<p>When a company buys another company, it usually pays more than the book value of the assets. The difference lands on the balance sheet as goodwill and acquired intangibles. For serial acquirers like Constellation Software or Lifco, that is a large part of the capital base.</p>" +
          "<p>Excluding goodwill flatters the return: it shows how good the businesses are once bought, not how good the buying was. Including it shows what shareholders actually earn on what was paid. That’s why the Strategy Book uses a separate bar: <strong>15% without, or 12% with goodwill included for serial acquirers and holding companies.</strong></p>" +
          "<h5>Free cash flow per share</h5>" +
          "<p>Earnings can be shaped by accounting. Cash is harder to fake. Free cash flow is the cash left after the business has paid for what it needs to keep running and growing. <em>Per share</em> matters because a company can grow total cash flow by issuing shares, and that growth isn’t yours.</p>" +
          "<p>The best growth in free cash flow per share comes from a mix of sources: more sales, pricing power, operating leverage as fixed costs spread over more revenue, and buying back shares at sensible prices. Growth should be stable over time, spread across regions and business lines, protected from economic cycles, and not dependent on debt.</p>" +
          "<h5>Quality can only be understood through comparison</h5>" +
          "<p>A 15% ROIC means little alone. Compare it with the company’s own history over ten years or a full cycle, with its closest peers, and with the cost of capital. A great business has earned high returns for a long time, through bad years too. That’s what the first step of the moat test asks for.</p>" +
          '<div class="box"><b class="t">Keep this</b>High returns on capital, for a long time, turned into growing cash per share. Look for both, and judge them against history and peers.</div>'
      },
      {
        title: "Growth is only as good as its returns",
        html:
          "<p>Investors love growth. But growth costs money. To grow, a company has to reinvest part of its earnings, and how much it has to reinvest depends on the return it earns on that money.</p>" +
          '<div class="box"><b class="t">The growth equation</b>Growth = ROIC x reinvestment rate<br>Reinvestment rate = growth / ROIC<br>Free cash flow = earnings x (1 − growth / ROIC)</div>' +
          "<h5>Same growth, very different businesses</h5>" +
          "<p>Take two companies that both earn 100 and both grow 10% a year.</p>" +
          "<ul><li><strong>Company A earns 30% on capital.</strong> To grow 10%, it reinvests 10 / 30 = a third of its earnings. Two thirds are free cash it can pay out, use for buybacks, or keep for acquisitions.</li>" +
          "<li><strong>Company B earns 10% on capital.</strong> To grow 10%, it must reinvest 10 / 10 = everything. Nothing is left for the owner. The growth is real, but the owner never sees the cash.</li></ul>" +
          "<p>Over ten years A produces more than a thousand in free cash. B produces zero. The income statements look equally healthy. Only one of them is a compounder. You’ll try this in the first exercise.</p>" +
          "<h5>Returns on the next krone</h5>" +
          "<p>Past ROIC tells you what the business earned on the capital already in it. What drives future value is the return on the <em>next</em> krone, sometimes called ROIIC: return on incremental invested capital. A company with a high historical ROIC but nowhere to reinvest at high returns becomes a cash cow. That’s fine, but it won’t compound. A company that can keep reinvesting at high returns is the jewel the Strategy Book is looking for.</p>" +
          "<h5>Capital allocation is the job</h5>" +
          "<p>Once a business is mature, the most important thing management does is decide what to do with the cash: reinvest in the business, acquire, pay down debt, buy back shares, or pay dividends. Every option has a return, and the best managers act like owners comparing those returns.</p>" +
          "<p>The serial acquirers in the core of the portfolio show what good capital allocation looks like. They buy many small businesses at sensible prices, keep them decentralised, and send the cash on to the next acquisition. My lesson from studying Constellation Software is that decentralisation only works with ownership and accountability, and that good acquirers are strong at integration, not just buying.</p>" +
          "<p>Watch for the opposite too:</p>" +
          "<ul><li>Dividends or buybacks paid with debt.</li><li>Buybacks at peak prices, when the shares are expensive.</li><li>Large acquisitions outside the company’s circle of competence. Rentokil’s Terminix deal is the clearest example in the Strategy Book’s sell list.</li><li>Leadership that blames the market and gives no timeline. I sold a company once because management couldn’t say when it would be profitable again. Unclear leadership is a red flag.</li></ul>" +
          "<blockquote>Dividends are unfortunately not a free lunch.<cite>Arne Ulland, Dagens Næringsliv, 2022</cite></blockquote>" +
          "<p>A high dividend can mean a business has nothing better to do with its cash, and it triggers tax on the way out. Growth in earnings per share isn’t taxed until you sell. I care about total return: the dividend plus the growth in value per share.</p>" +
          '<div class="box"><b class="t">Keep this</b>Never judge growth alone. Ask what it costs. High returns on capital turn growth into cash; low returns turn growth into a treadmill.</div>'
      },
      {
        title: "Where the money goes: Porter’s five forces",
        html:
          "<p>Before you judge a company, judge the pond it swims in. Michael Porter’s five forces are a checklist for that, but the Strategy Book reads them in a particular way:</p>" +
          "<blockquote>The industry’s profit is one pot. The five forces are five parties fighting over it.</blockquote>" +
          "<p>The five are: rivalry between existing companies, the threat of new entrants, the power of suppliers, the power of customers, and the threat of substitutes. Each one is a counterparty that wants part of your margin. A strong force means someone else ends up with the money: the customer, the supplier or the competitor. You’re looking for few and weak forces.</p>" +
          "<h5>Growth is not the same as attractive</h5>" +
          "<p>An industry growing very fast attracts new entrants and sharper rivalry. The growth often ends up with the customer, not the owner. Airlines have grown for decades and destroyed capital for most of them. Structure beats growth, every time.</p>" +
          "<h5>One force decides</h5>" +
          "<p>Five filled-in boxes feel like analysis, but they aren’t. In practice one force decides the outcome. The Strategy Book makes you write it as a sentence before you go on:</p>" +
          '<div class="box"><b class="t">The one sentence</b>The binding force in this industry is ___, because ___.<br><br>If you can’t write it, the analysis isn’t finished.</div>' +
          "<h5>Test case: Novo Nordisk</h5>" +
          "<p>This is my own mistake, so I know it well. I analysed industry growth (enormous), the number of competitors (two) and the barriers to entry (patents into the 2030s). All of it was right. What I didn’t rank properly:</p>" +
          "<ul><li>The quality gap between the two products was closing.</li><li>The payers, insurers and governments, were very powerful.</li><li>A doctor could switch a patient from one brand to the other at no cost.</li><li>A legal substitute was available at a fraction of the price.</li></ul>" +
          "<p>The binding force was <strong>customer bargaining power</strong>, and in my analysis it got half a sentence. Fair Isaac (FICO) failed on the same force: customers gained power when a substitute went from unavailable to available. Two different industries, one lesson.</p>" +
          "<h5>How to use it</h5>" +
          "<ol><li>Go through the five forces quickly, with one or two lines each.</li><li>Pick the one that decides who keeps the profit.</li><li>Write the sentence.</li><li>Carry that force into the next step: which of the company’s powers protects against <em>that</em> force?</li></ol>" +
          '<div class="box"><b class="t">Keep this</b>Find the one force that takes the profit, write it in one sentence, and don’t let growth distract you from structure.</div>'
      },
      {
        title: "Why it lasts: 7 Powers and the moat test",
        html:
          "<p>Porter tells you about the industry. Hamilton Helmer’s <em>7 Powers</em> tells you about the company: why can’t a competitor copy this profitably?</p>" +
          '<table><tr><th>Power</th><th>What it means</th><th>Example</th></tr>' +
          "<tr><td>Scale economies</td><td>Unit cost falls with size, so a rival must take your share first</td><td>Waste Connections, Copart</td></tr>" +
          "<tr><td>Network effects</td><td>Value rises with the number of users</td><td>Visa, CME, MSCI</td></tr>" +
          "<tr><td>Counter-positioning</td><td>A new model incumbents can’t copy without hurting themselves</td><td>Copart vs physical auctions</td></tr>" +
          "<tr><td>Switching costs</td><td>The customer loses time, money or safety by switching</td><td>Vertical software</td></tr>" +
          "<tr><td>Branding</td><td>Willingness to pay beyond function, built over decades</td><td>Ferrari, Richemont</td></tr>" +
          "<tr><td>Cornered resource</td><td>Preferred access to something valuable</td><td>HEICO’s certified parts</td></tr>" +
          "<tr><td>Process power</td><td>An organised way of working that takes years to copy, not money</td><td>Constellation, Lifco, Keyence</td></tr></table>" +
          "<h5>Benefit and barrier, both at once</h5>" +
          "<p>A power needs two things at the same time. <strong>Benefit:</strong> it must improve cash flow through higher prices, lower costs or less capital. Not “we’re better”, but “we earn more per krone”. <strong>Barrier:</strong> rivals can’t compete it away, or won’t, because copying would be unprofitable for them. Better software today is benefit without barrier: a competitor builds the same thing next year. That’s a head start, not a power.</p>" +
          "<h5>Who controls the barrier?</h5>" +
          "<p>This is the control question in the Strategy Book. If the barrier sits in the competitor’s own economics, it’s a real power. If it sits in the customer’s habits and switching costs, it’s real but measurable, and it can wear down. If it sits with a regulator, it’s not a power at all. FICO’s benefit was real: it earned far more per credit score than it cost to produce. Its barrier sat with a US housing finance regulator, and it changed with one decision.</p>" +
          "<h5>The moat test</h5>" +
          "<p>The Moat test tool walks you through three steps, combining Pat Dorsey’s moat framework with 7 Powers:</p>" +
          "<ol><li><strong>Proof.</strong> Has the company earned ROIC above the bar for ten years or a full cycle? If not, there’s no moat, unless an outside, verifiable change has already happened. Hope doesn’t count.</li><li><strong>Source.</strong> Name at least one power with both benefit and barrier. No power, no moat, however good the numbers.</li><li><strong>Durability.</strong> Wide if the excess returns likely last 20 years or more; narrow if 10 years, uncertain after. A regulatory barrier caps it at narrow.</li></ol>" +
          "<h5>The order of the analysis</h5>" +
          "<p>Porter first: which force binds? Then 7 Powers: which power defends against that force? If none does, the thesis is weak however good the numbers are. Then a pre-mortem: it’s five years from now and the investment has halved. Write the story of why. It replaces the SWOT analysis, and it’s far more honest.</p>" +
          "<h5>What to stay away from</h5>" +
          "<p>Quality is also about what you don’t own. My list: commodities and businesses that live on macro, turnarounds, companies with heavy regulatory risk or high customer concentration, hyper-growth with speculative end values, and anything with net debt above four times EBITDA. Below two is better. Debt is what usually turns a good company into a bad one.</p>" +
          '<div class="box"><b class="t">Keep this</b>A moat is a benefit plus a barrier that someone other than a regulator controls, proven by long, high returns.</div>'
      }
    ],
    exercises: [
      {
        id: "m2-roic", sim: "roic", title: "Calculate ROIC, with and without goodwill",
        intro: "The defaults describe a serial acquirer: operating profit of 120, a 25% tax rate, and 600 of invested capital, of which 200 is goodwill.",
        task: { q: "With the defaults, what is ROIC including goodwill, and does it pass the bar for a serial acquirer?", options: ["22.5%, passes", "15.0%, passes the 12% bar for acquirers", "10.0%, fails", "15.0%, fails because it’s under 20%"], answer: 1, why: "120 x 0.75 = 90, and 90 / 600 = 15%. Excluding goodwill it looks like 22.5%, which flatters the result. Acquirers are judged at 12% with goodwill included." }
      },
      {
        id: "m2-engine", sim: "engine", title: "Same growth, different cash",
        intro: "Two companies start with 100 in earnings and want the same growth. Change their returns on capital and watch the cash they can pay out.",
        task: { q: "Keep growth at 10% and set company B’s ROIC to 10%. How much free cash does B produce over ten years?", options: ["About the same as A", "About half of A", "Zero: B has to reinvest everything to grow", "More than A, because it reinvests more"], answer: 2, why: "Reinvestment rate = growth / ROIC = 10 / 10 = 100%. B grows, but the owner never sees any cash." }
      }
    ],
    assignment: {
      title: "A quality check on a real company",
      intro: "Use the same company as in module 1, or another one you know well. Look up the numbers in its annual reports or in the Moat test tool.",
      company: "Company",
      fields: [
        { q: "How does the company make money? Two sentences.", hint: "If you can’t, stop here and read the latest annual report first." },
        { q: "What has ROIC been over the last ten years, or a full cycle? Above the bar every year?", hint: "Use 15%, or 12% with goodwill for serial acquirers and holding companies." },
        { q: "How fast has free cash flow per share grown, and where did the growth come from?", hint: "Sales, pricing, margins, buybacks or acquisitions? How much debt did it take?" },
        { q: "Finish the sentence: the binding force in this industry is ___, because ___.", hint: "One force. One sentence." },
        { q: "Which power defends against that force? Name the benefit, the barrier, and who controls the barrier.", hint: "If a regulator controls it, the moat is narrow at most." },
        { q: "Pre-mortem: it’s five years from now and the investment has halved. What happened?", hint: "Write the most likely story, not the most dramatic one." }
      ]
    },
    tools: [
      { href: "/moat", label: "Moat test", why: "ROIC history for any company, the three steps and the twelve-question checklist" }
    ],
    reading: [
      { href: SUB + "podcast-transcript-long-term-investing", label: "Podcast transcript: long-term investing", why: "margins, debt and capital allocation" },
      { href: SUB + "podcast-transcript-arne-ulland-on", label: "Podcast transcript: Arne Ulland on investing", why: "stable compounders and unclear leadership" },
      { href: SUB + "some-thoughts-about-csu-and-nvo-after", label: "Some thoughts about CSU and NVO", why: "two theses under pressure" }
    ],
    test: [
      { q: "What ROIC and growth does the Strategy Book look for?", options: ["ROIC above 8%, any growth", "ROIC above 15% and free cash flow per share growing over 10% a year", "ROIC above 30% only", "Revenue growth above 20%"], answer: 1, why: "Two numbers: ROIC above 15% for a long time, and normalised growth in FCF per share above 10% a year." },
      { q: "How is ROIC calculated?", options: ["Net income / equity", "EBIT x (1 − tax rate) / invested capital", "Revenue / total assets", "Free cash flow / market value"], answer: 1, why: "After-tax operating profit divided by the capital tied up in the business." },
      { q: "Why does the Strategy Book include goodwill for serial acquirers?", options: ["It makes the number higher", "It shows what shareholders earn on what was actually paid", "Goodwill is cash", "Regulators require it"], answer: 1, why: "Excluding goodwill shows the quality of the bought businesses, not the quality of the buying." },
      { q: "A company earns 20% on capital and grows 10% a year. What share of earnings must it reinvest?", options: ["20%", "50%", "10%", "100%"], answer: 1, why: "Reinvestment rate = growth / ROIC = 10 / 20 = 50%." },
      { q: "Why is free cash flow measured per share?", options: ["It’s easier to find", "A company can grow total cash flow by issuing shares, and that growth isn’t yours", "Per-share numbers are always higher", "It removes the effect of debt"], answer: 1, why: "Dilution can create growth in the total that never reaches each share." },
      { q: "How does the Strategy Book read Porter’s five forces?", options: ["Five separate scores to add up", "Five parties fighting over one pot of profit, where one force usually decides", "A list of growth drivers", "A replacement for valuation"], answer: 1, why: "Strong forces take the margin. Find the one that binds." },
      { q: "What was the binding force in the Novo Nordisk case?", options: ["Threat of new entrants", "Supplier power", "Customer bargaining power", "Rivalry from many small competitors"], answer: 2, why: "Powerful payers, no cost to switch, and a cheap legal substitute. It got half a sentence in the original analysis." },
      { q: "What two things does a power need at the same time?", options: ["Growth and margins", "A benefit to cash flow and a barrier that stops rivals competing it away", "A patent and a brand", "A big market and low debt"], answer: 1, why: "Benefit without barrier is a head start. Barrier without benefit earns nothing." },
      { q: "A moat rests on a government mandate. What is the most it can be classified as?", options: ["Wide", "Narrow", "It can’t be classified", "Wide if ROIC is high"], answer: 1, why: "A regulator can remove it with one decision, so it’s narrow at most." },
      { q: "In what order does the Strategy Book run the analysis?", options: ["SWOT, valuation, Porter", "Porter, 7 Powers, pre-mortem", "Valuation first, then quality", "7 Powers, Porter, SWOT"], answer: 1, why: "Industry first, then the company’s defence against the binding force, then an honest pre-mortem." }
    ]
  });
})();
