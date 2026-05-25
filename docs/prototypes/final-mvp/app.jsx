// ПРАНТЕ — Telegram bot prototype (liquid-glass light theme)
// Mimics real Telegram iOS rendering: text-only bubbles with TG formatting,
// floating glass header + input, inline keyboards, edit-in-place tool calls.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Wallpaper — soft bluish with subtle dot pattern
// ─────────────────────────────────────────────────────────────
function TelegramWallpaper() {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'linear-gradient(180deg, var(--theme-wallpaper-top) 0%, var(--theme-wallpaper-bottom) 100%)',
      overflow:'hidden', zIndex:0,
    }}>
      <svg width="100%" height="100%" style={{position:'absolute', inset:0, opacity:.45}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tgPat" width="56" height="56" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.4" fill="rgba(255,255,255,.7)"/>
            <circle cx="36" cy="20" r="1.0" fill="rgba(255,255,255,.55)"/>
            <circle cx="18" cy="40" r="1.2" fill="rgba(255,255,255,.6)"/>
            <circle cx="46" cy="46" r="0.9" fill="rgba(255,255,255,.5)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tgPat)"/>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Liquid-glass pill / surface
// ─────────────────────────────────────────────────────────────
function Glass({ children, style = {}, radius = 9999, intense = false }) {
  return (
    <div style={{ position:'relative', borderRadius:radius, ...style }}>
      <div style={{
        position:'absolute', inset:0, borderRadius:'inherit',
        backdropFilter:`blur(${intense?28:22}px) saturate(180%)`,
        WebkitBackdropFilter:`blur(${intense?28:22}px) saturate(180%)`,
        background:'rgba(255,255,255,.55)',
        boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,.85), 0 1px 3px rgba(20,40,60,.07), 0 6px 22px rgba(20,40,60,.06)',
      }}/>
      <div style={{position:'relative', zIndex:1, borderRadius:'inherit'}}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating header (chevron pill + title pill + avatar)
// ─────────────────────────────────────────────────────────────

function BrandAvatar({ size = 44, compact = false }) {
  const innerScale = compact ? '70%' : 'var(--theme-avatar-logo-scale)';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:'var(--theme-avatar-bg)',
      display:'grid', placeItems:'center', overflow:'hidden', flexShrink:0,
      boxShadow:'0 1px 3px rgba(0,0,0,.10), 0 4px 14px rgba(20,40,60,.08), inset 0 0 0 1px var(--theme-avatar-ring)',
    }} aria-label="ПРАНТЕ">
      <img
        src="assets/prante-logo-transparent.png"
        alt=""
        style={{
          width: innerScale,
          height: innerScale,
          objectFit:'contain',
          objectPosition:'center var(--theme-avatar-logo-y)',
          display:'block'
        }}
      />
    </div>
  );
}

function FloatingHeader({ status, working, name = 'ПРАНТЕ' }) {

  return (
    <div style={{
      position:'absolute', top:55, left:8, right:8, zIndex:30,
      display:'flex', alignItems:'center', gap:8,
    }}>
      {/* back chevron pill */}
      <Glass style={{height:44, width:44}}>
        <div style={{height:44, width:44, display:'grid', placeItems:'center'}}>
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none">
            <path d="M9 1L1.5 9L9 17" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Glass>
      {/* center title pill */}
      <Glass style={{flex:1, height:44}}>
        <div style={{padding:'4px 14px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:44}}>
          <div style={{fontSize:15, fontWeight:600, color:'var(--theme-ink)', letterSpacing:'-.01em', lineHeight:1.1}}>{name}</div>
          <div style={{fontSize:12, color: working ? 'var(--theme-accent)' : 'var(--theme-muted)', marginTop:1, lineHeight:1.1, display:'flex', alignItems:'center', gap:4}}>
            {working && <span className="pulse-dot"/>}
            {status}
          </div>
        </div>
      </Glass>
      {/* avatar */}
      <BrandAvatar size={44} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating input (Menu pill + paperclip + field + mic)
// ─────────────────────────────────────────────────────────────
function FloatingInput({ menuLabel = 'Меню' }) {
  return (
    <div style={{
      position:'absolute', bottom:42, left:8, right:8, zIndex:30,
      display:'flex', alignItems:'center', gap:8,
    }}>
      {/* Menu (orange) */}
      <button style={{
        appearance:'none', border:0, cursor:'pointer',
        height:44, padding:'0 14px 0 12px', borderRadius:9999, flexShrink:0,
        background:'linear-gradient(180deg, var(--theme-menu-start), var(--theme-menu-end))',
        color:'#fff', fontFamily:'inherit', fontSize:15, fontWeight:600,
        display:'flex', alignItems:'center', gap:6,
        boxShadow:'0 1px 2px rgba(180,80,0,.25), 0 4px 14px rgba(243,123,33,.28)',
      }}>
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
          <rect y="1" width="16" height="2" rx="1" fill="#fff"/>
          <rect y="6" width="16" height="2" rx="1" fill="#fff"/>
          <rect y="11" width="16" height="2" rx="1" fill="#fff"/>
        </svg>
        {menuLabel}
      </button>
      {/* paperclip */}
      <Glass style={{height:44, width:44}}>
        <div style={{height:44, width:44, display:'grid', placeItems:'center'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="var(--theme-icon-ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </Glass>
      {/* message field */}
      <Glass style={{flex:1, height:44}}>
        <div style={{height:44, padding:'0 16px', display:'flex', alignItems:'center', fontSize:15, color:'var(--theme-muted)'}}>
          Сообщение
        </div>
      </Glass>
      {/* mic */}
      <Glass style={{height:44, width:44}}>
        <div style={{height:44, width:44, display:'grid', placeItems:'center'}}>
          <svg width="18" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="var(--theme-icon-ink)" strokeWidth="1.7"/>
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="var(--theme-icon-ink)" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </div>
      </Glass>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Telegram-realistic bubble
// Time + checks absolutely positioned in bottom-right corner.
// An inline-block reservation span sits in the text flow so the
// last line never overlaps the meta — exactly Telegram's trick.
// ─────────────────────────────────────────────────────────────
function Bubble({ who, children, time, read, edited, tail = true }) {
  const isUser = who === 'user';
  // exact reservation widths in px: time (~30) + check (~16) + gap (~3) + edited (~52 if shown)
  const checkW = isUser ? 16 : 0;
  const timeW = 30; // "06:55"
  const editedW = edited ? 56 : 0; // "изменено "
  const reserveW = editedW + timeW + checkW + 8; // + right padding breathing room
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth:'82%', marginLeft: isUser ? 40 : 0, marginRight: isUser ? 0 : 40,
    }}>
      <div style={{
        background: isUser ? 'var(--theme-bubble-user)' : 'var(--theme-bubble-bot)',
        color:'#000',
        padding:'6px 10px 7px 10px',
        borderRadius:14,
        borderBottomRightRadius: isUser && tail ? 4 : 14,
        borderBottomLeftRadius: !isUser && tail ? 4 : 14,
        boxShadow:'0 1px 0.5px rgba(0,0,0,.13)',
        fontSize:15, lineHeight:1.34, letterSpacing:'-.005em',
        wordBreak:'break-word', whiteSpace:'pre-wrap',
        position:'relative',
      }}>
        <span style={{display:'inline'}}>{children}</span>
        {time && (
          <>
            {/* invisible inline reservation — keeps last text line from overlapping the meta */}
            <span aria-hidden="true" style={{
              display:'inline-block', width: reserveW, height: 1, verticalAlign:'bottom',
            }}/>
            <span style={{
              position:'absolute', right:8, bottom:4,
              fontSize:11, color: isUser ? 'var(--theme-success)' : 'var(--theme-muted)',
              display:'inline-flex', alignItems:'center', gap:3,
              lineHeight:1, userSelect:'none', whiteSpace:'nowrap',
            }}>
              {edited && <span style={{fontStyle:'italic', opacity:.85, marginRight:2}}>изменено</span>}
              {time}
              {isUser && (
                <span style={{
                  display:'inline-flex', alignItems:'center',
                  color: read ? '#4FAE4E' : 'var(--theme-muted)',
                  marginLeft:2,
                }}>
                  {read ? (
                    <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
                      <path d="M0.7 5 L3 7.4 L8 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      <path d="M5 5 L7.3 7.4 L13.3 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                      <path d="M0.7 5 L3 7.4 L8.3 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Date separator chip (glass)
// ─────────────────────────────────────────────────────────────
function DateChip({ children }) {
  return (
    <div style={{alignSelf:'center', margin:'8px 0 4px'}}>
      <div style={{
        background:'rgba(255,255,255,.5)', color:'var(--theme-icon-ink)',
        backdropFilter:'blur(14px) saturate(180%)',
        WebkitBackdropFilter:'blur(14px) saturate(180%)',
        boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,.7)',
        fontSize:12.5, fontWeight:600,
        padding:'4px 11px', borderRadius:14,
      }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline keyboard — Telegram-style buttons attached below message
// ─────────────────────────────────────────────────────────────
function InlineKeyboard({ rows }) {
  return (
    <div style={{
      alignSelf:'flex-start', display:'flex', flexDirection:'column', gap:4,
      maxWidth:'92%', marginTop:3, marginLeft:0, marginRight:8,
    }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{display:'flex', gap:4}}>
          {row.map((b, bi) => (
            <button key={bi} style={{
              flex:1, minWidth:0, appearance:'none', border:0, cursor:'pointer',
              minHeight:36, padding:'7px 10px',
              borderRadius:12,
              background:'rgba(255,255,255,.55)',
              backdropFilter:'blur(14px) saturate(180%)',
              WebkitBackdropFilter:'blur(14px) saturate(180%)',
              boxShadow:'inset 0 0 0 0.5px rgba(255,255,255,.7), 0 1px 2px rgba(20,40,60,.05)',
              color:'var(--theme-accent)', fontFamily:'inherit',
              fontSize:13.5, fontWeight:500, letterSpacing:'-.01em', lineHeight:1.15,
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:6, textAlign:'center',
            }}>{b}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// File attachment (real Telegram doc preview)
// ─────────────────────────────────────────────────────────────
function FileAttach({ title, meta }) {
  return (
    <div style={{display:'flex', gap:10, alignItems:'center', minWidth:220, padding:'2px 0'}}>
      <div style={{
        width:42, height:42, borderRadius:'50%',
        background:'var(--theme-success)',
        display:'grid', placeItems:'center', flexShrink:0,
        boxShadow:'0 1px 2px rgba(0,0,0,.1)',
      }}>
        <svg width="20" height="22" viewBox="0 0 24 28" fill="none">
          <path d="M5 2h11l6 6v17a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" fill="#fff"/>
          <path d="M16 2v6h6" fill="var(--theme-success-soft)"/>
          <path d="M8 14h10M8 18h10M8 22h7" stroke="var(--theme-success)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{minWidth:0, flex:1}}>
        <div style={{fontWeight:600, fontSize:15, color:'#000', lineHeight:1.25}}>{title}</div>
        <div style={{fontSize:13, color:'var(--theme-muted)', marginTop:2}}>{meta}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Telegram formatting primitives (used inline inside bubbles)
// ─────────────────────────────────────────────────────────────
const B = ({children}) => <b style={{fontWeight:600}}>{children}</b>;
const I = ({children}) => <i>{children}</i>;
const Code = ({children}) => <code style={{
  fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize:13.5, background:'rgba(0,0,0,.06)',
  padding:'1px 4px', borderRadius:4,
}}>{children}</code>;
const BQ = ({children}) => (
  <div style={{
    borderLeft:'3px solid var(--theme-accent)', paddingLeft:8, margin:'4px 0',
    color:'var(--theme-ink)',
  }}>{children}</div>
);

// Tool-call line inside an edit-in-place bubble
function ToolLine({ state, emoji, label, detail }) {
  // state: 'done' | 'active' | 'pending'
  return (
    <div style={{display:'flex', gap:7, alignItems:'flex-start', padding:'2px 0', opacity: state==='pending'?.45:1}}>
      <span style={{
        fontSize:15, lineHeight:'20px', width:18, flexShrink:0, display:'inline-block', textAlign:'center',
      }} className={state==='active' ? 'thinking-emoji' : ''}>
        {state==='done' ? '✅' : state==='active' ? (emoji || '⏳') : '◽️'}
      </span>
      <span style={{flex:1, fontSize:14.5, lineHeight:'20px'}}>
        <span style={{fontWeight: state==='done'?500:500, color:'var(--theme-ink)'}}>{label}</span>
        {detail && <span style={{color:'var(--theme-muted)'}}> — {detail}</span>}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Typing dots bubble
// ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{alignSelf:'flex-start', maxWidth:'82%'}}>
      <div style={{
        background:'var(--theme-bubble-bot)', padding:'10px 12px', borderRadius:14,
        borderBottomLeftRadius:4, boxShadow:'0 1px 0.5px rgba(0,0,0,.13)',
        display:'inline-flex', gap:4, alignItems:'center',
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:6, height:6, borderRadius:'50%', background:'#a0acb6',
            animation:`tg-bounce 1.2s ease-in-out ${i*.16}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Render any bot/user message body
// ─────────────────────────────────────────────────────────────
function RenderMessage({ m, content }) {
  const side = m.kind === 'user' ? 'tg-msg-user' : m.kind === 'date' ? 'tg-msg-center' : 'tg-msg-bot';
  const inner = (() => {
  if (m.kind === 'date') return <DateChip>{m.text}</DateChip>;
  const b = m.body;
  if (m.kind === 'user') {
    if (b.type === 'file') {
      return <Bubble who="user" time={m.time} read={m.read}><FileAttach title={b.title} meta={b.meta} /></Bubble>;
    }
    return <Bubble who="user" time={m.time} read={m.read}>{b.text}</Bubble>;
  }
  // bot
  if (b.type === 'greeting') {
    return (
      <>
        <Bubble who="bot" time={m.time}>
          <B>Здравствуйте 👋</B>{'\n'}{b.text}
          {'\n\n'}<I>{b.hint}</I>
        </Bubble>
        <InlineKeyboard rows={[[b.commands[0], b.commands[1]],[b.commands[2], b.commands[3]]]} />
      </>
    );
  }
  if (b.type === 'text') return <Bubble who="bot" time={m.time} edited={b.edited}>{b.text}</Bubble>;

  if (b.type === 'toolCall') {
    // Edit-in-place message: header line + (optional) tool list.
    // When steps is empty → thinking phase (just animated header).
    const thinking = !b.steps || b.steps.length === 0;
    const allDone = !thinking && b.steps.every(s => s.state === 'done');
    return (
      <>
        <Bubble who="bot" time={m.time} edited={b.edited}>
          <B>
            {allDone ? '✅ Разбор готов' : (
              <>
                <span className="thinking-emoji" style={{display:'inline-block'}}>{b.headerEmoji || '🤔'}</span>
                {' '}{b.headerText}
                {!allDone && <span className="ellipsis-dots"><span>.</span><span>.</span><span>.</span></span>}
              </>
            )}
          </B>
          {!thinking && (
            <div style={{marginTop:6, display:'flex', flexDirection:'column'}}>
              {b.steps.map((s,i) => (
                <ToolLine key={i} state={s.state} emoji={s.emoji} label={s.label} detail={s.state==='done'?s.detail:(s.state==='active'?s.detail:null)} />
              ))}
            </div>
          )}
        </Bubble>
      </>
    );
  }

  if (b.type === 'report') {
    return (
      <>
        <Bubble who="bot" time={m.time}>
          <B>📊 {content.report.summaryTitle}</B>{'\n\n'}
          {content.report.metrics.map((metric, i) => (
            <React.Fragment key={i}>• <B>{metric.value}</B> {metric.label}{'\n'}</React.Fragment>
          ))}
          {'\n'}
          {content.report.summary[0]}{'\n\n'}
          <B>{content.report.risksTitle}:</B>{'\n'}
          {content.report.risks.map((risk, i) => (
            <React.Fragment key={i}>— {risk}{'\n'}</React.Fragment>
          ))}
          {'\n'}
          <B>📚 {content.report.termsTitle}:</B>{'\n'}
          {content.glossary.items.map((t, i) => (
            <React.Fragment key={i}>
              • <Code>{t.source}</Code> → <B>{t.target}</B>{'\n'}
              <span style={{color:'var(--theme-muted)'}}>   {t.note}</span>{i<content.glossary.items.length-1?'\n':''}
            </React.Fragment>
          ))}
        </Bubble>
        <InlineKeyboard rows={[[content.report.buttons[0]], [content.report.buttons[1], content.report.buttons[2]]]} />
      </>
    );
  }

  if (b.type === 'draft') {
    return (
      <Bubble who="bot" time={m.time}>
        <B>📝 {content.chat.draftTitle}</B>{'\n\n'}{b.text}
        {'\n\n'}<I>{content.chat.draftWarning}</I>
      </Bubble>
    );
  }

  if (b.type === 'memory') {
    return (
      <>
        <Bubble who="bot" time={m.time}>
          <B>💾 {content.chat.memoryTitle}</B>{'\n\n'}
          <BQ><Code>{content.chat.memoryRuleSource}</Code> → <B>{content.chat.memoryRuleTarget}</B></BQ>
          {b.text}
        </Bubble>
        <InlineKeyboard rows={[[b.buttons[0]], [b.buttons[1], b.buttons[2]]]} />
      </>
    );
  }

  if (b.type === 'final') {
    return (
      <Bubble who="bot" time={m.time}>
        <B>✅ {content.chat.finalTitle}</B>{'\n\n'}{b.text}
      </Bubble>
    );
  }
  return null;
  })();
  if (!inner) return null;
  return <div className={`tg-msg ${side}`}>{inner}</div>;
}

// ─────────────────────────────────────────────────────────────
// Main app — orchestrates scenario, handles scroll
// ─────────────────────────────────────────────────────────────
function PranteApp({ content, runKey, skip, speed }) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [headerStatus, setHeaderStatus] = useState(content.botHeader.statusIdle);
  const [working, setWorking] = useState(false);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const runIdRef = useRef(0);

  // Pin to bottom on changes (simple, robust)
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const smoothPin = () => {
      // smooth scroll for the natural-feeling slide-up of older messages
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };
    const hardPin = () => { el.scrollTop = el.scrollHeight; };
    smoothPin();
    const r1 = requestAnimationFrame(smoothPin);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(smoothPin));
    // late re-pin in case images/long content reflow — hard pin to be safe
    const ts = [120, 360, 720].map(ms => setTimeout(smoothPin, ms));
    const tHard = setTimeout(hardPin, 1500);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); ts.forEach(clearTimeout); clearTimeout(tHard); };
  }, [messages, typing]);

  // Scenario
  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const cancelled = () => runIdRef.current !== runId;
    setMessages([]);
    setTyping(false);
    setHeaderStatus(content.botHeader.statusIdle);
    setWorking(false);

    const wait = (ms) => new Promise(r => {
      if (skip || cancelled()) return r();
      const SLOW = 1.6; // total runtime ~50s
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(t); clearInterval(ck); r(); };
      const t = setTimeout(finish, (ms * SLOW) / (speed || 1));
      const ck = setInterval(() => { if (cancelled()) finish(); }, 60);
    });
    const time = () => new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    const push = (m) => setMessages(prev => [...prev, { ...m, id: Math.random(), time: time() }]);
    const updateLast = (updater) => setMessages(prev => {
      if (!prev.length) return prev;
      const c = [...prev];
      c[c.length-1] = { ...c[c.length-1], ...updater(c[c.length-1]), edited: true };
      return c;
    });
    const markUserRead = () => setMessages(prev => prev.map(m => m.kind==='user' ? {...m, read:true} : m));

    const buildToolSteps = (current) => content.progress.steps.map((s, i) => ({
      state: i < current ? 'done' : i === current ? 'active' : 'pending',
      label: s.label,
      detail: s.detail,
      emoji: ['🧠','🔁','📚','✒️','📝'][i] || '⏳',
    }));

    (async () => {
      push({ kind:'date', text: content.chat.dateLabel, time:null });
      await wait(150);

      // greeting
      push({ kind:'bot', body:{ type:'greeting', text: content.chat.startMessage, hint: content.chat.startHint, commands: content.chat.commands }});
      await wait(900);
      if (cancelled()) return;

      // user intent
      push({ kind:'user', body:{ type:'text', text: content.chat.userMessage }, read:false });
      await wait(300); markUserRead();
      await wait(200);

      // user file
      push({ kind:'user', body:{ type:'file', title: content.chat.fileTitle, meta: content.chat.fileMeta }, read:false });
      setHeaderStatus(content.botHeader.statusWorking); setWorking(true);
      await wait(450); markUserRead();

      // typing
      setTyping(true); await wait(1100); setTyping(false);

      // ─── thinking phase: bubble with just "Думаю..." header, no steps yet
      push({ kind:'bot', body:{
        type:'toolCall',
        headerText:'Думаю над документом', headerEmoji:'🤔',
        steps: [],
      }});
      await wait(content.progress.thinkingMs || 3500);
      if (cancelled()) return;

      // ─── transition: same bubble grows into the tool-call list
      updateLast(m => ({ body:{
        ...m.body,
        headerText: content.progress.steps[0].active || `${content.progress.steps[0].label}…`,
        headerEmoji: content.progress.steps[0].emoji || '🔍',
        steps: buildToolSteps(0),
      }}));
      await wait(content.progress.steps[0].durationMs);

      for (let i=1; i<content.progress.steps.length; i++) {
        if (cancelled()) return;
        updateLast(m => ({ body:{
          ...m.body,
          headerText: content.progress.steps[i].active || `${content.progress.steps[i].label}…`,
          headerEmoji: content.progress.steps[i].emoji || '🔍',
          steps: buildToolSteps(i),
        }}));
        await wait(content.progress.steps[i].durationMs);
      }
      // mark all done
      updateLast(m => ({ body:{ ...m.body, headerText: content.chat.readyTitle || 'Разбор готов', steps: content.progress.steps.map((s,i)=>({state:'done', label:s.label, detail:s.detail, emoji:s.emoji || ['🧠','🔁','📚','✒️','📝'][i]||'✅'})) } }));
      setHeaderStatus(content.botHeader.statusDone); setWorking(false);
      await wait(1200);

      // report bubble
      push({ kind:'bot', body:{ type:'report' }});
      await wait(1100);
      if (cancelled()) return;

      // user accepts terms
      push({ kind:'user', body:{ type:'text', text: content.chat.glossaryUserAction }, read:false });
      await wait(300); markUserRead();
      setTyping(true); await wait(650); setTyping(false);
      push({ kind:'bot', body:{ type:'text', text: content.chat.glossaryBotReply }});
      await wait(800);

      // draft
      push({ kind:'user', body:{ type:'text', text: content.chat.draftUserAction }, read:false });
      await wait(300); markUserRead();
      setTyping(true); setWorking(true); setHeaderStatus(content.botHeader.statusWorking);
      await wait(1100); setTyping(false); setWorking(false); setHeaderStatus(content.botHeader.statusDone);
      push({ kind:'bot', body:{ type:'draft', text: content.chat.draftText }});
      await wait(850);
      if (cancelled()) return;

      // edit + memory ask
      push({ kind:'user', body:{ type:'text', text: content.chat.editUserAction }, read:false });
      await wait(300); markUserRead();
      setTyping(true); await wait(650); setTyping(false);
      push({ kind:'bot', body:{ type:'memory', text: content.chat.memoryText, buttons: content.chat.memoryButtons }});
      await wait(900);

      // save
      push({ kind:'user', body:{ type:'text', text: content.chat.memoryUserAction }, read:false });
      await wait(300); markUserRead();
      setTyping(true); await wait(550); setTyping(false);
      push({ kind:'bot', body:{ type:'final', text: content.chat.finalText }});
    })();

    return () => {
      if (runIdRef.current === runId) runIdRef.current += 1;
    };
  }, [runKey, skip, speed]);

  return (
    <div style={{position:'relative', width:'100%', height:'100%', overflow:'hidden'}}>
      <TelegramWallpaper />

      {/* Scroll area */}
      <div ref={scrollRef} className="tg-scroll" style={{
        position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', zIndex:1,
        paddingTop:115, paddingBottom:120, paddingLeft:8, paddingRight:8,
      }}>
        <div ref={contentRef} style={{display:'flex', flexDirection:'column', gap:4}}>
          {messages.map(m => <RenderMessage key={m.id} m={m} content={content} />)}
          {typing && <div className="tg-typing"><TypingDots /></div>}
        </div>
      </div>

      {/* Top fade behind header */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:108, zIndex:20,
        background:'linear-gradient(180deg, rgba(207,221,231,.9) 0%, rgba(207,221,231,.55) 60%, transparent 100%)',
        pointerEvents:'none',
      }}/>
      {/* Bottom fade behind input */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:110, zIndex:20,
        background:'linear-gradient(0deg, rgba(185,205,218,.92) 0%, rgba(185,205,218,.55) 55%, transparent 100%)',
        pointerEvents:'none',
      }}/>

      <FloatingHeader status={headerStatus} working={working} name={content.botHeader.name} />
      <FloatingInput menuLabel={content.botHeader.menu} />
    </div>
  );
}

window.PranteApp = PranteApp;
