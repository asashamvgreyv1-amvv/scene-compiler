const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT='/Users/raghav/Desktop/Work/scene-compiler';
const html=fs.readFileSync(ROOT+'/tests/run.js','utf8');
const FILES=eval(html.match(/const FILES = (\[[\s\S]*?\]);/)[1]);
const ctx=vm.createContext({console});
for(const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx);
const SC=ctx.SC; SC.buildIndex();
const [mode,target,level,...inputs]=process.argv.slice(2);
for(const i of inputs){ const r=SC.compile(i,Object.assign({mode,target,detail:+level,seed:7,audio:true}, process.env.OPTS?JSON.parse(process.env.OPTS):{})); console.log('\n### '+i+' ('+r.words+'w)\n'+r.prompt); if(process.env.NEG) console.log('NEG: '+r.negative); if(r.spec.notes.length) console.log('NOTES: '+r.spec.notes.join(' | ')); if(process.env.CHIPS) console.log(JSON.stringify(r.parsed.mentions.map(m=>[m.cat,m.entry.id,m.role||''])),r.parsed.corrections);}
