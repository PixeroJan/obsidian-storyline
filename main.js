var T8=Object.create;var aa=Object.defineProperty;var D8=Object.getOwnPropertyDescriptor;var H8=Object.getOwnPropertyNames;var F8=Object.getPrototypeOf,V8=Object.prototype.hasOwnProperty;var K6=(E,o)=>{for(var e in o)aa(E,e,{get:o[e],enumerable:!0})},h8=(E,o,e,a)=>{if(o&&typeof o=="object"||typeof o=="function")for(let r of H8(o))!V8.call(E,r)&&r!==e&&aa(E,r,{get:()=>o[r],enumerable:!(a=D8(o,r))||a.enumerable});return E};var lt=(E,o,e)=>(e=E!=null?T8(F8(E)):{},h8(o||!E||!E.__esModule?aa(e,"default",{value:E,enumerable:!0}):e,E)),B8=E=>h8(aa({},"__esModule",{value:!0}),E);var G8={};K6(G8,{default:()=>X6});module.exports=B8(G8);var _=require("obsidian");var $=require("obsidian"),Y6={storyLineRoot:"StoryLine",activeProjectFile:"",defaultStatus:"idea",autoGenerateSequence:!0,defaultTargetWordCount:800,defaultView:"board",colorCoding:"status",showWordCounts:!0,compactCardView:!1,dailyWordGoal:1e3,enablePlotHoleDetection:!0,showWarnings:!0,debugMode:!1,sceneTemplates:[],tagColors:{},tagTypeOverrides:{}},ra=class extends $.PluginSettingTab{constructor(o,e){super(o,e),this.plugin=e}display(){let{containerEl:o}=this;o.empty(),o.createEl("h1",{text:"StoryLine Settings"}),o.createEl("h2",{text:"StoryLine Root"}),new $.Setting(o).setName("Root folder").setDesc("Root folder for all StoryLine projects in your vault").addText(r=>r.setPlaceholder("StoryLine").setValue(this.plugin.settings.storyLineRoot).onChange(async s=>{this.plugin.settings.storyLineRoot=s||"StoryLine",await this.plugin.saveSettings()})),o.createEl("h2",{text:"Scene Defaults"}),new $.Setting(o).setName("Default status").setDesc("Status for newly created scenes").addDropdown(r=>{["idea","outlined","draft","written","revised","final"].forEach(n=>r.addOption(n,n.charAt(0).toUpperCase()+n.slice(1))),r.setValue(this.plugin.settings.defaultStatus),r.onChange(async n=>{this.plugin.settings.defaultStatus=n,await this.plugin.saveSettings()})}),new $.Setting(o).setName("Auto-generate sequence").setDesc("Automatically assign sequence numbers to new scenes").addToggle(r=>r.setValue(this.plugin.settings.autoGenerateSequence).onChange(async s=>{this.plugin.settings.autoGenerateSequence=s,await this.plugin.saveSettings()})),new $.Setting(o).setName("Target word count").setDesc("Default target word count per scene").addText(r=>r.setPlaceholder("800").setValue(String(this.plugin.settings.defaultTargetWordCount)).onChange(async s=>{this.plugin.settings.defaultTargetWordCount=Number(s)||800,await this.plugin.saveSettings()})),o.createEl("h2",{text:"Display Options"}),new $.Setting(o).setName("Default view").setDesc("Which view to open by default").addDropdown(r=>{r.addOption("board","Board"),r.addOption("timeline","Timeline"),r.addOption("storyline","Storylines"),r.addOption("character","Characters"),r.addOption("stats","Statistics"),r.setValue(this.plugin.settings.defaultView),r.onChange(async s=>{this.plugin.settings.defaultView=s,await this.plugin.saveSettings()})}),new $.Setting(o).setName("Color coding").setDesc("How to color-code scene cards").addDropdown(r=>{r.addOption("status","By Status"),r.addOption("pov","By POV Character"),r.addOption("emotion","By Emotion"),r.addOption("act","By Act"),r.addOption("tag","By Tag / Plotline"),r.setValue(this.plugin.settings.colorCoding),r.onChange(async s=>{this.plugin.settings.colorCoding=s,await this.plugin.saveSettings()})}),new $.Setting(o).setName("Show word counts").setDesc("Display word counts on scene cards").addToggle(r=>r.setValue(this.plugin.settings.showWordCounts).onChange(async s=>{this.plugin.settings.showWordCounts=s,await this.plugin.saveSettings()})),new $.Setting(o).setName("Compact card view").setDesc("Show less detail on scene cards").addToggle(r=>r.setValue(this.plugin.settings.compactCardView).onChange(async s=>{this.plugin.settings.compactCardView=s,await this.plugin.saveSettings()})),o.createEl("h2",{text:"Writing Goals"}),new $.Setting(o).setName("Daily word goal").setDesc("Target number of words per day (shown in Stats view)").addText(r=>r.setPlaceholder("1000").setValue(String(this.plugin.settings.dailyWordGoal)).onChange(async s=>{this.plugin.settings.dailyWordGoal=Number(s)||1e3,await this.plugin.saveSettings()})),o.createEl("h2",{text:"Advanced"}),new $.Setting(o).setName("Enable plot hole detection").setDesc("Show warnings for potential plot holes").addToggle(r=>r.setValue(this.plugin.settings.enablePlotHoleDetection).onChange(async s=>{this.plugin.settings.enablePlotHoleDetection=s,await this.plugin.saveSettings()})),new $.Setting(o).setName("Show warnings").setDesc("Display warning notifications").addToggle(r=>r.setValue(this.plugin.settings.showWarnings).onChange(async s=>{this.plugin.settings.showWarnings=s,await this.plugin.saveSettings()})),new $.Setting(o).setName("Debug mode").setDesc("Enable debug logging in console").addToggle(r=>r.setValue(this.plugin.settings.debugMode).onChange(async s=>{this.plugin.settings.debugMode=s,await this.plugin.saveSettings()})),o.createEl("h2",{text:"Tag / Plotline Colors"}),o.createEl("p",{text:"Assign colors to tags (plotlines) that persist across all views. Tags without a color use the default accent.",cls:"setting-item-description"});let e=o.createDiv("story-line-tag-color-list");this.renderTagColorList(e),o.createEl("h2",{text:"Scene Templates"}),o.createEl("p",{text:"Custom templates pre-fill fields and body text when creating new scenes. Built-in templates are always available.",cls:"setting-item-description"});let a=o.createDiv("story-line-template-list");this.renderTemplateList(a),new $.Setting(o).addButton(r=>r.setButtonText("Add Template").setCta().onClick(()=>{let s={name:"",description:"",defaultFields:{},bodyTemplate:""};new oa(this.app,s,async n=>{this.plugin.settings.sceneTemplates.push(n),await this.plugin.saveSettings(),this.renderTemplateList(a)}).open()}))}renderTagColorList(o){var n;o.empty();let e=this.plugin.settings.tagColors||{},a=[];try{a=((n=this.plugin.sceneManager)==null?void 0:n.getAllTags())||[]}catch(i){}let r=Object.keys(e).filter(i=>!a.includes(i)),s=[...a,...r].sort();if(s.length===0){o.createEl("p",{text:"No tags found. Create scenes with tags to assign colors here.",cls:"setting-item-description"});return}for(let i of s){let l=e[i]||"",d=new $.Setting(o).setName(i).setDesc(l?`Custom: ${l}`:"Using default accent");d.addColorPicker(c=>{c.setValue(l||"#888888"),c.onChange(async p=>{this.plugin.settings.tagColors[i]=p,d.setDesc(`Custom: ${p}`),await this.plugin.saveSettings(),this.plugin.refreshOpenViews()})}),d.addExtraButton(c=>c.setIcon("x").setTooltip("Remove custom color").onClick(async()=>{delete this.plugin.settings.tagColors[i],await this.plugin.saveSettings(),this.renderTagColorList(o),this.plugin.refreshOpenViews()}))}}renderTemplateList(o){o.empty();let e=this.plugin.settings.sceneTemplates;if(e.length===0){o.createEl("p",{text:"No custom templates yet. Built-in templates (Blank, Action Scene, Dialogue Scene, Flashback, Opening Chapter) are always available.",cls:"setting-item-description"});return}for(let a=0;a<e.length;a++){let r=e[a];new $.Setting(o).setName(r.name||"(unnamed)").setDesc(r.description||"").addExtraButton(s=>s.setIcon("pencil").setTooltip("Edit template").onClick(()=>{new oa(this.app,{...r},async n=>{this.plugin.settings.sceneTemplates[a]=n,await this.plugin.saveSettings(),this.renderTemplateList(o)}).open()})).addExtraButton(s=>s.setIcon("trash").setTooltip("Delete template").onClick(async()=>{this.plugin.settings.sceneTemplates.splice(a,1),await this.plugin.saveSettings(),this.renderTemplateList(o)}))}}},oa=class extends $.Modal{constructor(o,e,a){super(o),this.template={...e,defaultFields:{...e.defaultFields}},this.onSave=a}onOpen(){let{contentEl:o}=this;o.createEl("h3",{text:this.template.name?"Edit Template":"New Template"}),new $.Setting(o).setName("Template name").addText(n=>n.setPlaceholder("e.g. Climax Scene").setValue(this.template.name).onChange(i=>this.template.name=i)),new $.Setting(o).setName("Description").addText(n=>n.setPlaceholder("Short description\u2026").setValue(this.template.description||"").onChange(i=>this.template.description=i||void 0)),new $.Setting(o).setName("Default status").addDropdown(n=>{n.addOption("","(none)"),["idea","outlined","draft","written","revised","final"].forEach(l=>n.addOption(l,l.charAt(0).toUpperCase()+l.slice(1))),n.setValue(this.template.defaultFields.status||""),n.onChange(l=>{l?this.template.defaultFields.status=l:delete this.template.defaultFields.status})}),new $.Setting(o).setName("Default emotion").addText(n=>n.setPlaceholder("e.g. tense, hopeful").setValue(this.template.defaultFields.emotion||"").onChange(i=>{i?this.template.defaultFields.emotion=i:delete this.template.defaultFields.emotion})),new $.Setting(o).setName("Default tags").setDesc("Comma-separated").addText(n=>n.setPlaceholder("flashback, dream").setValue((this.template.defaultFields.tags||[]).join(", ")).onChange(i=>{let l=i.split(",").map(d=>d.trim()).filter(Boolean);l.length?this.template.defaultFields.tags=l:delete this.template.defaultFields.tags})),new $.Setting(o).setName("Target word count").addText(n=>n.setPlaceholder("e.g. 1200").setValue(this.template.defaultFields.target_wordcount?String(this.template.defaultFields.target_wordcount):"").onChange(i=>{let l=Number(i);l>0?this.template.defaultFields.target_wordcount=l:delete this.template.defaultFields.target_wordcount})),o.createEl("h4",{text:"Body Template"}),o.createEl("p",{text:"This text is inserted into the scene file body when using this template.",cls:"setting-item-description"});let e=new $.TextAreaComponent(o);e.setValue(this.template.bodyTemplate),e.onChange(n=>this.template.bodyTemplate=n),e.inputEl.rows=10,e.inputEl.style.width="100%",e.inputEl.style.fontFamily="var(--font-monospace)";let a=o.createDiv({cls:"story-line-button-row"});a.createEl("button",{text:"Cancel"}).addEventListener("click",()=>this.close()),a.createEl("button",{text:"Save",cls:"mod-cta"}).addEventListener("click",()=>{this.template.name.trim()||(this.template.name="Untitled Template"),this.onSave(this.template),this.close()})}onClose(){this.contentEl.empty()}};var O=require("obsidian");function J6(E,o){let e=`${E}/${o}`;return{sceneFolder:`${e}/Scenes`,characterFolder:`${e}/Characters`,locationFolder:`${e}/Locations`}}var It=require("obsidian");var At={linear:"Linear",flashback:"Flashback",flash_forward:"Flash-forward",parallel:"Parallel timeline",frame:"Frame narrative",simultaneous:"Simultaneous",timeskip:"Time skip",dream:"Dream / Vision",mythic:"Mythic / Legend",circular:"Circular"},Ct={linear:"arrow-right",flashback:"undo-2",flash_forward:"redo-2",parallel:"git-branch",frame:"frame",simultaneous:"copy",timeskip:"skip-forward",dream:"cloud",mythic:"scroll-text",circular:"repeat"},sa=["linear","flashback","flash_forward","parallel","frame","simultaneous","timeskip","dream","mythic","circular"],u8=[{name:"Blank",description:"Empty scene \u2014 no pre-filled body",defaultFields:{},bodyTemplate:""},{name:"Action Scene",description:"Goal / Conflict / Outcome structure",defaultFields:{emotion:"tense"},bodyTemplate:`## Goal
What does the POV character want in this scene?

## Conflict
What stands in their way? Who opposes them?

## Action
Describe the key beats of the scene.

## Outcome
How does the scene end? What changes for the character?`},{name:"Dialogue Scene",description:"Character conversation with emotional stakes",defaultFields:{emotion:"reflective"},bodyTemplate:`## Setup
Where are the characters, and what brought them here?

## Dialogue Focus
What is the conversation about? What subtext is at play?

## Emotional Stakes
What does each speaker want from this exchange?

## Takeaway
How has the relationship shifted by the end?`},{name:"Flashback",description:"Past event revealed to the reader",defaultFields:{tags:["flashback"]},bodyTemplate:`## Trigger
What in the present triggers this memory?

## The Memory
Describe the past event in vivid detail.

## Emotional Weight
Why does this memory matter now?

## Return to Present
How does the character feel after reliving this?`},{name:"Opening Chapter",description:"Hook, world, and character introduction",defaultFields:{status:"idea"},bodyTemplate:`## Hook
What grabs the reader's attention on page one?

## World & Setting
Establish time, place, and atmosphere.

## Character Introduction
Who is the POV character? What do they want?

## Inciting Moment
What disrupts the status quo?`}],ia=[{name:"Save the Cat",summary:"Blake Snyder's 15-beat screenplay structure",acts:[1,2,3],chapters:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],actLabels:{1:"Act 1 \u2014 Setup",2:"Act 2 \u2014 Confrontation",3:"Act 3 \u2014 Resolution"},chapterLabels:{1:"Opening Image",2:"Theme Stated",3:"Set-Up",4:"Catalyst",5:"Debate",6:"Break into Two",7:"B Story",8:"Fun and Games",9:"Midpoint",10:"Bad Guys Close In",11:"All Is Lost",12:"Dark Night of the Soul",13:"Break into Three",14:"Finale",15:"Final Image"},beats:[{act:1,label:"Opening Image",description:"A snapshot of the protagonist's world before the journey begins."},{act:1,label:"Theme Stated",description:"Someone poses a question or statement hinting at the story's theme."},{act:1,label:"Set-Up",description:"Establish the protagonist's world, introduce key characters and stakes."},{act:1,label:"Catalyst",description:"An event that disrupts the status quo and sets the story in motion."},{act:1,label:"Debate",description:"The protagonist hesitates \u2014 should they accept the call to adventure?"},{act:2,label:"Break into Two",description:"The protagonist commits and enters the new world / situation."},{act:2,label:"B Story",description:"A secondary storyline (often the love story) begins."},{act:2,label:"Fun and Games",description:"The promise of the premise \u2014 the reason the audience came."},{act:2,label:"Midpoint",description:"A major twist \u2014 false victory or false defeat that raises the stakes."},{act:2,label:"Bad Guys Close In",description:"External pressure mounts; internal doubts surface."},{act:2,label:"All Is Lost",description:'The protagonist hits rock bottom \u2014 the "whiff of death."'},{act:2,label:"Dark Night of the Soul",description:"Deepest despair before the breakthrough."},{act:3,label:"Break into Three",description:"Eureka moment \u2014 the protagonist finds a new way forward."},{act:3,label:"Finale",description:"The protagonist confronts the antagonist with a new plan."},{act:3,label:"Final Image",description:"Mirror of the opening image \u2014 shows how the world has changed."}]},{name:"3-Act Structure",summary:"Classic three-act dramatic structure",acts:[1,2,3],chapters:[],actLabels:{1:"Act 1 \u2014 Setup",2:"Act 2 \u2014 Confrontation",3:"Act 3 \u2014 Resolution"},chapterLabels:{},beats:[{act:1,label:"Exposition",description:"Introduce the protagonist, setting, and ordinary world."},{act:1,label:"Inciting Incident",description:"An event that disrupts the equilibrium and launches the story."},{act:1,label:"First Turning Point",description:"The protagonist commits to the journey \u2014 end of Act 1."},{act:2,label:"Rising Action",description:"Escalating conflicts, obstacles, and complications."},{act:2,label:"Midpoint",description:"A pivotal event that shifts the protagonist's approach."},{act:2,label:"Crisis",description:"The stakes are at their highest \u2014 everything hangs in the balance."},{act:2,label:"Second Turning Point",description:"A major reversal that launches the protagonist into Act 3."},{act:3,label:"Climax",description:"The protagonist faces the central conflict head-on."},{act:3,label:"Falling Action",description:"Immediate aftermath of the climax."},{act:3,label:"D\xE9nouement",description:"Resolution \u2014 the new normal is established."}]},{name:"Hero's Journey",summary:"Joseph Campbell's monomyth in 12 stages",acts:[1,2,3],chapters:[1,2,3,4,5,6,7,8,9,10,11,12],actLabels:{1:"Act 1 \u2014 Departure",2:"Act 2 \u2014 Initiation",3:"Act 3 \u2014 Return"},chapterLabels:{1:"Ordinary World",2:"Call to Adventure",3:"Refusal of the Call",4:"Meeting the Mentor",5:"Crossing the Threshold",6:"Tests, Allies, Enemies",7:"Approach to the Inmost Cave",8:"The Ordeal",9:"Reward (Seizing the Sword)",10:"The Road Back",11:"Resurrection",12:"Return with the Elixir"},beats:[{act:1,label:"Ordinary World",description:"The hero's everyday life before the adventure."},{act:1,label:"Call to Adventure",description:"The hero receives a challenge or quest."},{act:1,label:"Refusal of the Call",description:"The hero hesitates or refuses the challenge."},{act:1,label:"Meeting the Mentor",description:"The hero gains guidance, training, or a gift."},{act:1,label:"Crossing the Threshold",description:"The hero commits to the journey and enters the special world."},{act:2,label:"Tests, Allies, Enemies",description:"The hero encounters challenges, makes allies, and faces enemies."},{act:2,label:"Approach to the Inmost Cave",description:"The hero prepares for the central ordeal."},{act:2,label:"The Ordeal",description:"The hero faces a life-or-death crisis."},{act:2,label:"Reward (Seizing the Sword)",description:"The hero claims the prize or knowledge gained."},{act:3,label:"The Road Back",description:"The hero begins the journey home, but faces pursuit or complications."},{act:3,label:"Resurrection",description:"The hero is tested once more \u2014 a final, purifying ordeal."},{act:3,label:"Return with the Elixir",description:"The hero returns transformed, bearing gifts or wisdom for the world."}]}];var z={idea:{label:"Idea",color:"var(--sl-status-idea, #9E9E9E)",icon:"lightbulb"},outlined:{label:"Outlined",color:"var(--sl-status-outlined, #2196F3)",icon:"list"},draft:{label:"Draft",color:"var(--sl-status-draft, #FF9800)",icon:"pencil"},written:{label:"Written",color:"var(--sl-status-written, #4CAF50)",icon:"file-text"},revised:{label:"Revised",color:"var(--sl-status-revised, #9C27B0)",icon:"refresh-cw"},final:{label:"Final",color:"var(--sl-status-final, #F44336)",icon:"check-circle"}},Q6=["idea","outlined","draft","written","revised","final"];var it=class{static async parseFile(o,e){let a=await o.vault.read(e);return this.parseContent(a,e.path)}static parseContent(o,e){var s,n,i;let a=this.extractFrontmatter(o);if(!a||a.type!=="scene")return null;let r=this.extractBody(o);return{filePath:e,type:"scene",title:a.title||this.titleFromPath(e),act:a.act,chapter:a.chapter,sequence:a.sequence,chronologicalOrder:(s=a.chronologicalOrder)!=null?s:a.chronological_order,pov:this.cleanWikilink(a.pov),characters:this.parseCharacters(a.characters),location:this.cleanWikilink(a.location),timeline:a.timeline,storyDate:(n=a.storyDate)!=null?n:a.story_date,storyTime:(i=a.storyTime)!=null?i:a.story_time,status:this.parseStatus(a.status),conflict:a.conflict,emotion:a.emotion,intensity:a.intensity,wordcount:this.countWords(r),target_wordcount:a.target_wordcount,tags:a.tags||[],setup_scenes:this.parseStringArray(a.setup_scenes),payoff_scenes:this.parseStringArray(a.payoff_scenes),created:a.created,modified:a.modified,body:r,notes:a.notes,timeline_mode:this.parseTimelineMode(a.timeline_mode),timeline_strand:a.timeline_strand}}static extractFrontmatter(o){let e=o.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!e)return null;try{return(0,It.parseYaml)(e[1])}catch(a){return null}}static extractBody(o){let e=o.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);return e?e[1].trim():o}static async updateFrontmatter(o,e,a){var d;let r=await o.vault.read(e),s=this.extractFrontmatter(r)||{},n=this.extractBody(r);for(let[c,p]of Object.entries(a))if(!(c==="filePath"||c==="body")){if(c==="notes"&&!p){delete s[c];continue}p!==void 0&&(s[c]=p)}s.modified=new Date().toISOString().split("T")[0];let i=(d=a.body)!=null?d:n;s.wordcount=this.countWords(i);let l=`---
${(0,It.stringifyYaml)(s)}---

${i}`;await o.vault.modify(e,l)}static generateSceneContent(o,e){var s,n,i,l;let a={type:"scene",title:o.title||"Untitled Scene"};o.act!==void 0&&(a.act=o.act),o.chapter!==void 0&&(a.chapter=o.chapter),o.sequence!==void 0&&(a.sequence=o.sequence),o.chronologicalOrder!==void 0&&(a.chronologicalOrder=o.chronologicalOrder),o.pov&&(a.pov=o.pov),(s=o.characters)!=null&&s.length&&(a.characters=o.characters),o.location&&(a.location=o.location),o.timeline&&(a.timeline=o.timeline),o.storyDate&&(a.storyDate=o.storyDate),o.storyTime&&(a.storyTime=o.storyTime),a.status=o.status||"idea",o.conflict&&(a.conflict=o.conflict),o.emotion&&(a.emotion=o.emotion),(n=o.tags)!=null&&n.length&&(a.tags=o.tags),(i=o.setup_scenes)!=null&&i.length&&(a.setup_scenes=o.setup_scenes),(l=o.payoff_scenes)!=null&&l.length&&(a.payoff_scenes=o.payoff_scenes),o.notes&&(a.notes=o.notes),o.timeline_mode&&o.timeline_mode!=="linear"&&(a.timeline_mode=o.timeline_mode),o.timeline_strand&&(a.timeline_strand=o.timeline_strand),a.wordcount=o.body?this.countWords(o.body):0,a.created=new Date().toISOString().split("T")[0],a.modified=new Date().toISOString().split("T")[0];let r=o.body||"";return`---
${(0,It.stringifyYaml)(a)}---

${r}`}static parseTimelineMode(o){if(o&&sa.includes(o))return o}static cleanWikilink(o){if(o)return o.replace(/^\[\[/,"").replace(/\]\]$/,"")}static parseCharacters(o){if(Array.isArray(o))return o.map(e=>e.replace(/^\[\[/,"").replace(/\]\]$/,""))}static parseStringArray(o){if(Array.isArray(o))return o.map(e=>String(e).replace(/^\[\[/,"").replace(/\]\]$/,""))}static parseStatus(o){if(o&&["idea","outlined","draft","written","revised","final"].includes(o))return o}static countWords(o){if(!o)return 0;let e=o.replace(/^#+\s+.*/gm,"").replace(/\[\[.*?\]\]/g,"").replace(/[*_~`]/g,"").trim();return e?e.split(/\s+/).filter(a=>a.length>0).length:0}static titleFromPath(o){return(o.split("/").pop()||"").replace(/\.md$/,"")}};var dt=require("obsidian");var t8=50,na=class{constructor(o){this.undoStack=[];this.redoStack=[];this.onAfterUndoRedo=null;this.app=o}recordUpdate(o,e,a,r,s="scene"){let n={};for(let i of Object.keys(a))n[i]=e[i];this.push({type:"update",domain:s,label:r||`Update ${s}`,filePath:o,oldValues:n,newValues:{...a}})}recordDelete(o,e,a,r="scene"){this.push({type:"delete",domain:r,label:a||`Delete ${r}`,filePath:o,fileContent:e})}recordCreate(o,e,a,r="scene"){this.push({type:"create",domain:r,label:a||`Create ${r}`,filePath:o,createdContent:e})}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}async undo(){var e;let o=this.undoStack.pop();if(!o)return new dt.Notice("Nothing to undo"),!1;try{return await this.applyReverse(o),this.redoStack.push(o),this.redoStack.length>t8&&this.redoStack.shift(),new dt.Notice(`Undo: ${o.label}`),(e=this.onAfterUndoRedo)==null||e.call(this),!0}catch(a){return console.error("StoryLine: undo failed",a),new dt.Notice(`Undo failed: ${a.message}`),!1}}async redo(){var e;let o=this.redoStack.pop();if(!o)return new dt.Notice("Nothing to redo"),!1;try{return await this.applyForward(o),this.undoStack.push(o),this.undoStack.length>t8&&this.undoStack.shift(),new dt.Notice(`Redo: ${o.label}`),(e=this.onAfterUndoRedo)==null||e.call(this),!0}catch(a){return console.error("StoryLine: redo failed",a),new dt.Notice(`Redo failed: ${a.message}`),!1}}clear(){this.undoStack=[],this.redoStack=[]}push(o){this.undoStack.push(o),this.undoStack.length>t8&&this.undoStack.shift(),this.redoStack=[]}async applyReverse(o){switch(o.type){case"update":{let e=this.app.vault.getAbstractFileByPath(o.filePath);if(!e||!(e instanceof dt.TFile))throw new Error("File not found");await it.updateFrontmatter(this.app,e,o.oldValues);break}case"delete":{if(!o.fileContent)throw new Error("No saved content for undo-delete");await this.ensureParentFolder(o.filePath),await this.app.vault.create(o.filePath,o.fileContent);break}case"create":{let e=this.app.vault.getAbstractFileByPath(o.filePath);e&&e instanceof dt.TFile&&await this.app.vault.trash(e,!0);break}}}async applyForward(o){switch(o.type){case"update":{let e=this.app.vault.getAbstractFileByPath(o.filePath);if(!e||!(e instanceof dt.TFile))throw new Error("File not found");await it.updateFrontmatter(this.app,e,o.newValues);break}case"delete":{let e=this.app.vault.getAbstractFileByPath(o.filePath);e&&e instanceof dt.TFile&&await this.app.vault.trash(e,!0);break}case"create":{if(!o.createdContent)throw new Error("No saved content for redo-create");await this.ensureParentFolder(o.filePath),await this.app.vault.create(o.filePath,o.createdContent);break}}}async ensureParentFolder(o){let e=o.split("/");if(e.pop(),e.length===0)return;let a=e.join("/");this.app.vault.getAbstractFileByPath(a)||await this.app.vault.createFolder(a)}};var la=class{constructor(o){this.sceneStore=o}getFilteredScenes(o,e){let a=this.sceneStore.getAllScenes();return o&&(a=a.filter(r=>this.matchesFilter(r,o))),e?a=this.sortScenes(a,e):a.sort((r,s)=>{var n,i;return((n=r.sequence)!=null?n:9999)-((i=s.sequence)!=null?i:9999)}),a}getScenesGroupedBy(o,e,a){let r=this.getFilteredScenes(e,a),s=new Map;for(let n of r){let i;switch(o){case"act":i=n.act!==void 0?`Act ${n.act}`:"No Act";break;case"chapter":i=n.chapter!==void 0?`Chapter ${n.chapter}`:"No Chapter";break;case"status":i=n.status||"No Status";break;case"pov":i=n.pov||"No POV";break;default:i="Unknown"}s.has(i)||s.set(i,[]),s.get(i).push(n)}return s}getScenesGroupedByWithEmpty(o,e,a,r,s){let n=this.getScenesGroupedBy(o,e,a);if(o==="act"&&r)for(let i of r){let l=`Act ${i}`;n.has(l)||n.set(l,[])}else if(o==="chapter"&&s)for(let i of s){let l=`Chapter ${i}`;n.has(l)||n.set(l,[])}return n}getUniqueValues(o){let e=new Set;for(let a of this.sceneStore.sceneValues()){let r=a[o];r!=null&&e.add(String(r))}return Array.from(e).sort()}getAllCharacters(){let o=new Map;for(let e of this.sceneStore.sceneValues())if(e.characters&&e.characters.forEach(a=>{let r=a.toLowerCase();o.has(r)||o.set(r,a)}),e.pov){let a=e.pov.toLowerCase();o.has(a)||o.set(a,e.pov)}return Array.from(o.values()).sort((e,a)=>e.toLowerCase().localeCompare(a.toLowerCase()))}getAllTags(){let o=new Set;for(let e of this.sceneStore.sceneValues())e.tags&&e.tags.forEach(a=>o.add(a));return Array.from(o).sort()}getStatistics(){var c;let o=this.sceneStore.getAllScenes(),e=o.length,a={},r=0,s=0,n={},i={},l={},d=0;for(let p of o){let f=p.status||"unknown";a[f]=(a[f]||0)+1,r+=p.wordcount||0,s+=p.target_wordcount||0;let g=p.act!==void 0?`Act ${p.act}`:"No Act";n[g]=(n[g]||0)+1,p.pov&&(i[p.pov]=(i[p.pov]||0)+1),p.location&&(l[p.location]=(l[p.location]||0)+1),!((c=p.tags)!=null&&c.length)&&!p.pov&&d++}return{totalScenes:e,statusCounts:a,totalWords:r,totalTargetWords:s,actCounts:n,povCounts:i,locationCounts:l,orphanedScenes:d}}matchesFilter(o,e){var a,r,s,n,i,l,d;if((a=e.status)!=null&&a.length&&(!o.status||!e.status.includes(o.status)))return!1;if((r=e.act)!=null&&r.length){let c=o.act!==void 0?String(o.act):"";if(!e.act.map(String).includes(c))return!1}if((s=e.chapter)!=null&&s.length){let c=o.chapter!==void 0?String(o.chapter):"";if(!e.chapter.map(String).includes(c))return!1}if((n=e.pov)!=null&&n.length&&(!o.pov||!e.pov.includes(o.pov))||(i=e.characters)!=null&&i.length&&(!o.characters||!e.characters.some(c=>o.characters.includes(c)))||(l=e.locations)!=null&&l.length&&(!o.location||!e.locations.includes(o.location))||(d=e.tags)!=null&&d.length&&(!o.tags||!e.tags.some(c=>o.tags.includes(c))))return!1;if(e.searchText){let c=e.searchText.toLowerCase();if(![o.title,o.conflict,o.emotion,o.pov,o.location,...o.characters||[],...o.tags||[]].filter(Boolean).join(" ").toLowerCase().includes(c))return!1}return!0}sortScenes(o,e){let a=e.direction==="asc"?1:-1;return o.sort((r,s)=>{var i,l,d,c,p,f,g,u,h,y,x,m;let n=0;switch(e.field){case"sequence":n=((i=r.sequence)!=null?i:9999)-((l=s.sequence)!=null?l:9999);break;case"chronologicalOrder":n=((c=(d=r.chronologicalOrder)!=null?d:r.sequence)!=null?c:9999)-((f=(p=s.chronologicalOrder)!=null?p:s.sequence)!=null?f:9999);break;case"title":n=(r.title||"").localeCompare(s.title||"");break;case"status":n=Q6.indexOf(r.status||"idea")-Q6.indexOf(s.status||"idea");break;case"act":n=Number((g=r.act)!=null?g:0)-Number((u=s.act)!=null?u:0);break;case"chapter":n=Number((h=r.chapter)!=null?h:0)-Number((y=s.chapter)!=null?y:0);break;case"wordcount":n=((x=r.wordcount)!=null?x:0)-((m=s.wordcount)!=null?m:0);break;case"modified":n=(r.modified||"").localeCompare(s.modified||"");break}return n*a})}};var da=class{constructor(o,e){this.scenes=new Map;this.projects=new Map;this._activeProject=null;this.initialized=!1;this.app=o,this.plugin=e,this.undoManager=new na(o),this.queryService=new la(this)}sceneValues(){return this.scenes.values()}getProjects(){return Array.from(this.projects.values())}get activeProject(){return this._activeProject}getSceneFolder(){return this._activeProject?this._activeProject.sceneFolder:`${this.plugin.settings.storyLineRoot}/Scenes`}getCharacterFolder(){return this._activeProject?this._activeProject.characterFolder:`${this.plugin.settings.storyLineRoot}/Characters`}getLocationFolder(){return this._activeProject?this._activeProject.locationFolder:`${this.plugin.settings.storyLineRoot}/Locations`}async scanProjects(){var n;this.projects.clear();let o=this.plugin.settings.storyLineRoot,e=this.app.vault.adapter;if(!await e.exists(o))return[];let a=await e.list(o),r=async i=>{if(i.endsWith(".md"))try{let l=await e.read(i),d=this.parseProjectContent(l,i);d&&this.projects.set(i,d)}catch(l){}};for(let i of a.files)await r(i);for(let i of a.folders)try{let l=await e.list(i);for(let d of l.files)await r(d)}catch(l){}let s=this.plugin.settings.activeProjectFile;return s&&this.projects.has(s)?this._activeProject=this.projects.get(s):this.projects.size>0&&(this._activeProject=(n=this.projects.values().next().value)!=null?n:null,this._activeProject&&(this.plugin.settings.activeProjectFile=this._activeProject.filePath,await this.plugin.saveSettings())),this.getProjects()}async createProject(o,e=""){let a=this.plugin.settings.storyLineRoot;await this.ensureFolder(a);let r=o.replace(/[\\/:*?"<>|]/g,"-"),s=(0,O.normalizePath)(`${a}/${r}`),n=(0,O.normalizePath)(`${s}/${r}.md`),i=J6(a,r),l=new Date().toISOString().split("T")[0],c=`---
${(0,O.stringifyYaml)({type:"storyline",title:o,created:l})}---
${e}
`;try{await this.ensureFolder(s),await this.app.vault.create(n,c),await this.ensureFolder(i.sceneFolder),await this.ensureFolder(i.characterFolder),await this.ensureFolder(i.locationFolder);let p=["plotgrid.json","timeline.json","board.json","plotlines.json","stats.json"],f=[],g=[];for(let h of p){let y=(0,O.normalizePath)(`${s}/${h}`),x=JSON.stringify({},null,2),m=this.app.vault.getAbstractFileByPath(y);if(!m)await this.app.vault.create(y,x),f.push(y);else try{await this.app.vault.modify(m,x),g.push(y)}catch(v){}}let u={filePath:n,title:o,created:l,description:e,...i,definedActs:[],definedChapters:[],actLabels:{},chapterLabels:{},filterPresets:[]};return this.projects.set(n,u),new O.Notice(`Project "${o}" created`),u}catch(p){throw new O.Notice("Failed to create project file or folders: "+String(p)),p}}async setActiveProject(o){this._activeProject=o,this.plugin.settings.activeProjectFile=o.filePath,await this.plugin.saveSettings(),await this.initialize();try{this.plugin&&typeof this.plugin.refreshOpenViews=="function"&&this.plugin.refreshOpenViews()}catch(e){}}async forkProject(o,e){let a=await this.createProject(e,o.description),r=this.app.vault.getAbstractFileByPath(o.sceneFolder);if(r&&r instanceof O.TFolder){for(let s of r.children)if(s instanceof O.TFile&&s.extension==="md"){let n=await this.app.vault.read(s),i=(0,O.normalizePath)(`${a.sceneFolder}/${s.name}`);await this.app.vault.create(i,n)}}return new O.Notice(`Forked "${o.title}" \u2192 "${e}" (${r instanceof O.TFolder?r.children.filter(s=>s instanceof O.TFile).length:0} scenes copied)`),a}async parseProjectFile(o){let e=await this.app.vault.read(o);return this.parseProjectContent(e,o.path)}parseProjectContent(o,e){var r,s;let a=o.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!a)return null;try{let n=(0,O.parseYaml)(a[1]);if((n==null?void 0:n.type)!=="storyline")return null;let i=(s=(r=e.split("/").pop())==null?void 0:r.replace(/\.md$/i,""))!=null?s:e,l=n.title||i,d=this.plugin.settings.storyLineRoot,p=J6(d,i);return{filePath:e,title:l,created:n.created||"",description:o.slice(a[0].length).trim(),...p,definedActs:Array.isArray(n.acts)?n.acts.map(Number).filter(f=>!isNaN(f)):[],definedChapters:Array.isArray(n.chapters)?n.chapters.map(Number).filter(f=>!isNaN(f)):[],actLabels:n.actLabels&&typeof n.actLabels=="object"?Object.fromEntries(Object.entries(n.actLabels).map(([f,g])=>[Number(f),String(g)])):{},chapterLabels:n.chapterLabels&&typeof n.chapterLabels=="object"?Object.fromEntries(Object.entries(n.chapterLabels).map(([f,g])=>[Number(f),String(g)])):{},filterPresets:Array.isArray(n.filterPresets)?n.filterPresets:[]}}catch(n){return null}}async initialize(){this.scenes.clear();let o=this.getSceneFolder();await this.scanFolderAdapter(o),this.initialized=!0}async scanFolderAdapter(o){let e=this.app.vault.adapter;if(!await e.exists(o))return;let a=await e.list(o);for(let r of a.files)if(r.endsWith(".md"))try{let s=await e.read(r),n=it.parseContent(s,r);n&&this.scenes.set(r,n)}catch(s){}for(let r of a.folders)await this.scanFolderAdapter(r)}getAllScenes(){return Array.from(this.scenes.values())}getScene(o){return this.scenes.get(o)}getFilteredScenes(o,e){return this.queryService.getFilteredScenes(o,e)}getScenesGroupedBy(o,e,a){return this.queryService.getScenesGroupedBy(o,e,a)}async createScene(o,e){let a=this.getSceneFolder();await this.ensureFolder(a);let r=a;o.act!==void 0&&(r=(0,O.normalizePath)(`${a}/Act ${o.act}`),await this.ensureFolder(r)),this.plugin.settings.autoGenerateSequence&&(o.sequence=this.getNextSequence(e));let s=o.sequence!==void 0?String(o.sequence).padStart(2,"0"):"00",n=o.act!==void 0?String(o.act).padStart(2,"0"):"00",i=(o.title||"Untitled").replace(/[\\/:*?"<>|]/g,"-").substring(0,60),l=`${n}-${s} ${i}.md`,d=(0,O.normalizePath)(`${r}/${l}`),c=it.generateSceneContent(o),p=await this.app.vault.create(d,c);this.undoManager.recordCreate(p.path,c,`Create "${o.title||"scene"}"`);let f=await it.parseFile(this.app,p);return f&&this.scenes.set(p.path,f),p}async updateScene(o,e){let a=this.app.vault.getAbstractFileByPath(o);if(!a||!(a instanceof O.TFile)){new O.Notice("Scene file not found");return}let r=this.scenes.get(o);if(r){let n=`Update "${r.title}"`;this.undoManager.recordUpdate(o,r,e,n)}await it.updateFrontmatter(this.app,a,e);let s=await it.parseFile(this.app,a);s&&this.scenes.set(o,s)}async deleteScene(o){let e=this.app.vault.getAbstractFileByPath(o);if(!e||!(e instanceof O.TFile))return;let a=await this.app.vault.read(e),r=this.scenes.get(o),s=r?`Delete "${r.title}"`:"Delete scene";this.undoManager.recordDelete(o,a,s),await this.app.vault.trash(e,!0),this.scenes.delete(o)}async duplicateScene(o){let e=this.scenes.get(o);if(!e)return null;let{filePath:a,body:r,...s}=e,n={...s,title:`${e.title} (copy)`,sequence:this.getNextSequence(e)};return this.createScene(n)}async moveScene(o,e,a){let r={};e!==void 0&&(r.act=e),a!==void 0&&(r.sequence=a),await this.updateScene(o,r)}async resequenceScenes(o){for(let e=0;e<o.length;e++)await this.updateScene(o[e],{sequence:e+1})}async handleFileChange(o){if(o.extension!=="md"||!o.path.startsWith(this.getSceneFolder()))return;let e=await it.parseFile(this.app,o);e?this.scenes.set(o.path,e):this.scenes.delete(o.path)}handleFileDelete(o){this.scenes.delete(o)}async handleFileRename(o,e){if(this.scenes.delete(e),o.extension==="md"&&o.path.startsWith(this.getSceneFolder())){let a=await it.parseFile(this.app,o);a&&this.scenes.set(o.path,a)}}getUniqueValues(o){return this.queryService.getUniqueValues(o)}getAllCharacters(){return this.queryService.getAllCharacters()}getAllTags(){return this.queryService.getAllTags()}async renameTag(o,e){let a=0;for(let r of this.scenes.values())if(r.tags&&r.tags.includes(o)){let s=r.tags.map(n=>n===o?e:n);await this.updateScene(r.filePath,{tags:s}),a++}return a}async deleteTag(o){let e=0;for(let a of this.scenes.values())if(a.tags&&a.tags.includes(o)){let r=a.tags.filter(s=>s!==o);await this.updateScene(a.filePath,{tags:r}),e++}return e}getStatistics(){return this.queryService.getStatistics()}getDefinedActs(){var r,s;let o=(s=(r=this._activeProject)==null?void 0:r.definedActs)!=null?s:[],e=new Set;for(let n of this.scenes.values())if(n.act!==void 0&&typeof n.act=="number")e.add(n.act);else if(n.act!==void 0){let i=Number(n.act);isNaN(i)||e.add(i)}let a=new Set([...o,...e]);return Array.from(a).sort((n,i)=>n-i)}getDefinedChapters(){var r,s;let o=(s=(r=this._activeProject)==null?void 0:r.definedChapters)!=null?s:[],e=new Set;for(let n of this.scenes.values())if(n.chapter!==void 0&&typeof n.chapter=="number")e.add(n.chapter);else if(n.chapter!==void 0){let i=Number(n.chapter);isNaN(i)||e.add(i)}let a=new Set([...o,...e]);return Array.from(a).sort((n,i)=>n-i)}async addActs(o){if(!this._activeProject)return;let e=this._activeProject.definedActs,a=new Set([...e,...o]);this._activeProject.definedActs=Array.from(a).sort((r,s)=>r-s),await this.saveProjectFrontmatter(this._activeProject)}async removeAct(o){this._activeProject&&(this._activeProject.definedActs=this._activeProject.definedActs.filter(e=>e!==o),await this.saveProjectFrontmatter(this._activeProject))}async addChapters(o){if(!this._activeProject)return;let e=this._activeProject.definedChapters,a=new Set([...e,...o]);this._activeProject.definedChapters=Array.from(a).sort((r,s)=>r-s),await this.saveProjectFrontmatter(this._activeProject)}async removeChapter(o){this._activeProject&&(this._activeProject.definedChapters=this._activeProject.definedChapters.filter(e=>e!==o),await this.saveProjectFrontmatter(this._activeProject))}getActLabel(o){var e,a;return(a=(e=this._activeProject)==null?void 0:e.actLabels)==null?void 0:a[o]}getActLabels(){var o,e;return(e=(o=this._activeProject)==null?void 0:o.actLabels)!=null?e:{}}async setActLabel(o,e){this._activeProject&&(e.trim()?this._activeProject.actLabels[o]=e.trim():delete this._activeProject.actLabels[o],await this.saveProjectFrontmatter(this._activeProject))}getChapterLabel(o){var e,a;return(a=(e=this._activeProject)==null?void 0:e.chapterLabels)==null?void 0:a[o]}getChapterLabels(){var o,e;return(e=(o=this._activeProject)==null?void 0:o.chapterLabels)!=null?e:{}}async setChapterLabel(o,e){this._activeProject&&(e.trim()?this._activeProject.chapterLabels[o]=e.trim():delete this._activeProject.chapterLabels[o],await this.saveProjectFrontmatter(this._activeProject))}async applyBeatSheet(o){if(!this._activeProject)return;let e=new Set([...this._activeProject.definedActs,...o.acts]);if(this._activeProject.definedActs=Array.from(e).sort((a,r)=>a-r),o.chapters.length>0){let a=new Set([...this._activeProject.definedChapters,...o.chapters]);this._activeProject.definedChapters=Array.from(a).sort((r,s)=>r-s)}for(let[a,r]of Object.entries(o.actLabels))this._activeProject.actLabels[Number(a)]=r;if(o.chapterLabels)for(let[a,r]of Object.entries(o.chapterLabels))this._activeProject.chapterLabels[Number(a)]=r;await this.saveProjectFrontmatter(this._activeProject)}getFilterPresets(){var o,e;return(e=(o=this._activeProject)==null?void 0:o.filterPresets)!=null?e:[]}async addFilterPreset(o){this._activeProject&&(this._activeProject.filterPresets.push(o),await this.saveProjectFrontmatter(this._activeProject))}async removeFilterPreset(o){this._activeProject&&(this._activeProject.filterPresets.splice(o,1),await this.saveProjectFrontmatter(this._activeProject))}async saveProjectFrontmatter(o){let e=this.app.vault.getAbstractFileByPath(o.filePath);if(!e||!(e instanceof O.TFile))return;let a=await this.app.vault.read(e),r=a.match(/^---\r?\n([\s\S]*?)\r?\n---/),s={},n=a;if(r){try{s=(0,O.parseYaml)(r[1])||{}}catch(l){s={}}n=a.slice(r[0].length)}s.type="storyline",s.title=o.title,s.created=o.created,o.definedActs.length>0?s.acts=o.definedActs:delete s.acts,o.definedChapters.length>0?s.chapters=o.definedChapters:delete s.chapters,Object.keys(o.actLabels).length>0?s.actLabels=o.actLabels:delete s.actLabels,Object.keys(o.chapterLabels).length>0?s.chapterLabels=o.chapterLabels:delete s.chapterLabels,o.filterPresets.length>0?s.filterPresets=o.filterPresets:delete s.filterPresets;let i=`---
${(0,O.stringifyYaml)(s)}---${n}`;await this.app.vault.modify(e,i)}getScenesGroupedByWithEmpty(o,e,a){return this.queryService.getScenesGroupedByWithEmpty(o,e,a,this.getDefinedActs(),this.getDefinedChapters())}getNextSequence(o){let e=this.getAllScenes().map(a=>{var r;return(r=a.sequence)!=null?r:0}).sort((a,r)=>a-r);return(o==null?void 0:o.sequence)!==void 0?o.sequence+1:e.length>0?e[e.length-1]+1:1}async ensureFolder(o){let e=(0,O.normalizePath)(o);this.app.vault.getAbstractFileByPath(e)||await this.app.vault.createFolder(e)}};var nt="story-line-board",xt="story-line-timeline",gt="story-line-storyline",vt="story-line-character",yt="story-line-stats",Mt="story-line-plotgrid",bt="story-line-location";var q=require("obsidian"),X=lt(require("obsidian"));var ca=require("obsidian");function ct(E,o){let e=new ca.Modal(E);e.titleEl.setText(o.title),e.contentEl.createEl("p",{text:o.message}),new ca.Setting(e.contentEl).addButton(a=>{var r;a.setButtonText((r=o.cancelLabel)!=null?r:"Cancel").onClick(()=>{var s;e.close(),(s=o.onCancel)==null||s.call(o)})}).addButton(a=>{var s;let r=a.setButtonText((s=o.confirmLabel)!=null?s:"Confirm");o.confirmClass==="mod-cta"?r.setCta():r.setWarning(),r.onClick(async()=>{e.close(),await o.onConfirm()})}),e.open()}var pa=require("obsidian"),Y=lt(require("obsidian"));var wt=class{constructor(o,e,a,r){this.currentScene=null;this.container=o,this.plugin=e,this.sceneManager=a,this.onEdit=r.onEdit,this.onDelete=r.onDelete,this.onStatusChange=r.onStatusChange}formatIntensity(o){return o>0?`+${o}`:o<0?`${o}`:"0"}show(o){this.currentScene=o,this.render(),this.container.style.display="block"}hide(){this.currentScene=null,this.container.style.display="none"}render(){var R,P,F,I,et;let o=this.currentScene;if(!o)return;this.container.empty(),this.container.addClass("story-line-inspector");let e=this.container.createDiv("inspector-header");e.createEl("h3",{text:"Scene Details"}),e.createEl("button",{cls:"clickable-icon inspector-close",text:"\xD7"}).addEventListener("click",()=>this.hide());let r=this.container.createDiv("inspector-title-section");if(o.sequence!==void 0){let D=o.act!==void 0?String(o.act).padStart(2,"0"):"??",K=String(o.sequence).padStart(2,"0");r.createDiv({cls:"inspector-seq",text:`${D}-${K}`})}if(o.chronologicalOrder!==void 0&&o.chronologicalOrder!==o.sequence){let D=String(o.chronologicalOrder).padStart(2,"0");r.createDiv({cls:"inspector-chrono-seq",text:`C${D}`}).setAttribute("title",`Chronological order: ${D}`)}let s=o.timeline_mode||"linear";if(s!=="linear"){let D=r.createDiv({cls:`inspector-timeline-mode-badge timeline-mode-${s}`}),K=D.createSpan();Y.setIcon(K,Ct[s]||"clock"),D.createSpan({text:` ${At[s]}`}),o.timeline_strand&&D.createSpan({cls:"inspector-strand-label",text:` (${o.timeline_strand})`})}r.createEl("h4",{text:o.title||"Untitled"});let n=this.container.createDiv("inspector-section");n.createSpan({cls:"inspector-label",text:"Status: "});let i=n.createDiv("inspector-status-dropdown"),l=o.status||"idea",d=z[l],c=i.createEl("button",{cls:"inspector-status-button"}),p=c.createSpan({cls:"inspector-status-icon"});Y.setIcon(p,d.icon);let f=c.createSpan({text:d.label}),g=c.createSpan({cls:"inspector-status-chevron"});Y.setIcon(g,"chevron-down");let u=i.createDiv("inspector-status-menu");u.style.display="none",["idea","outlined","draft","written","revised","final"].forEach(D=>{let K=z[D],st=u.createDiv({cls:`inspector-status-item ${D===l?"active":""}`}),St=st.createSpan({cls:"inspector-status-icon"});Y.setIcon(St,K.icon),st.createSpan({text:K.label}),st.addEventListener("click",()=>{u.style.display="none",this.onStatusChange(o,D)})}),c.addEventListener("click",D=>{D.stopPropagation();let K=u.style.display!=="none";u.style.display=K?"none":"block"});let y=D=>{i.contains(D.target)||(u.style.display="none",document.removeEventListener("click",y))};c.addEventListener("click",()=>{setTimeout(()=>document.addEventListener("click",y),0)});let x=this.container.createDiv("inspector-section"),m=o.wordcount||0,v=o.target_wordcount||this.plugin.settings.defaultTargetWordCount;if(x.createSpan({cls:"inspector-label",text:"Words: "}),x.createSpan({text:`${m}`}),v&&x.createSpan({cls:"inspector-target",text:` / ~${v} target`}),o.pov){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"POV: "}),D.createSpan({text:o.pov})}let M=this.container.createDiv("inspector-section");M.createSpan({cls:"inspector-label",text:"Location: "});let b=M.createEl("select",{cls:"inspector-location-select"});b.createEl("option",{text:"None",value:""});let A=this.getLocationNames();for(let D of A){let K=b.createEl("option",{text:D,value:D});o.location===D&&(K.selected=!0)}if(o.location&&!A.includes(o.location)){let D=b.createEl("option",{text:o.location,value:o.location});D.selected=!0}if(b.addEventListener("change",async()=>{let D=b.value||void 0;await this.sceneManager.updateScene(o.filePath,{location:D}),o.location=D}),o.timeline){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Time: "}),D.createSpan({text:o.timeline})}if((R=o.characters)!=null&&R.length){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Characters:"});let K=D.createEl("ul",{cls:"inspector-list"});o.characters.forEach(st=>{let St=K.createEl("li");St.createSpan({text:st}),st===o.pov&&St.createSpan({cls:"inspector-pov-badge",text:" (POV)"})})}if(this.renderDetectedLinks(o),(P=o.tags)!=null&&P.length){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Plotlines / Tags:"});let K=D.createEl("ul",{cls:"inspector-list"}),st=this.plugin.settings.tagColors||{};o.tags.forEach(St=>{let f8=K.createEl("li");if(st[St]){let P8=f8.createSpan({cls:"inspector-tag-swatch"});P8.style.backgroundColor=st[St]}f8.appendText(St)})}if(o.body){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Description:"}),D.createEl("p",{cls:"inspector-description",text:o.body.length>300?o.body.substring(0,300)+"...":o.body})}if(o.conflict){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Conflict:"}),D.createEl("p",{cls:"inspector-conflict",text:o.conflict})}if(o.emotion){let D=this.container.createDiv("inspector-section");D.createSpan({cls:"inspector-label",text:"Emotion: "}),D.createSpan({text:o.emotion})}let S=this.container.createDiv("inspector-section inspector-intensity");S.createSpan({cls:"inspector-label",text:"Intensity: "});let L=S.createDiv("inspector-intensity-row"),C=L.createEl("input",{attr:{type:"range",min:"-10",max:"10",step:"1",value:String((F=o.intensity)!=null?F:0)},cls:"inspector-intensity-slider"}),w=L.createSpan({cls:"inspector-intensity-value",text:this.formatIntensity((I=o.intensity)!=null?I:0)});C.addEventListener("input",()=>{let D=Number(C.value);w.textContent=this.formatIntensity(D),w.className="inspector-intensity-value "+(D>0?"intensity-positive":D<0?"intensity-negative":"intensity-neutral")}),C.addEventListener("change",async()=>{let D=Number(C.value);await this.sceneManager.updateScene(o.filePath,{intensity:D})});let k=(et=o.intensity)!=null?et:0;w.className="inspector-intensity-value "+(k>0?"intensity-positive":k<0?"intensity-negative":"intensity-neutral"),this.renderSetupPayoff(o),this.renderNotes(o),this.renderSnapshots(o);let T=this.container.createDiv("inspector-actions");T.createEl("button",{cls:"mod-cta",text:"Edit Scene"}).addEventListener("click",()=>this.onEdit(o)),T.createEl("button",{cls:"mod-warning",text:"Delete"}).addEventListener("click",()=>{ct(this.plugin.app,{title:"Delete Scene",message:`Delete scene "${o.title||"Untitled"}"?`,confirmLabel:"Delete",onConfirm:()=>{this.onDelete(o),this.hide()}})})}renderSetupPayoff(o){var p,f,g;let e=this.container.createDiv("inspector-section inspector-setup-payoff");e.createSpan({cls:"inspector-label",text:"Setup / Payoff:"});let a=e.createDiv("inspector-sp-row"),r=a.createSpan();Y.setIcon(r,"arrow-right"),a.createSpan({text:" Sets up:",cls:"inspector-sp-label"});let s=e.createDiv("inspector-sp-list");(p=o.payoff_scenes)!=null&&p.length?o.payoff_scenes.forEach(u=>{let h=s.createDiv("inspector-sp-chip");h.createSpan({text:u.replace(/^\[\[|\]\]$/g,"")}),h.createEl("button",{cls:"inspector-sp-remove clickable-icon",text:"\xD7"}).addEventListener("click",async()=>{var M;let x=(o.payoff_scenes||[]).filter(b=>b!==u);await this.sceneManager.updateScene(o.filePath,{payoff_scenes:x});let m=this.sceneManager.getAllScenes().find(b=>b.title===u);if(m&&((M=m.setup_scenes)!=null&&M.includes(o.title))){let b=m.setup_scenes.filter(A=>A!==o.title);await this.sceneManager.updateScene(m.filePath,{setup_scenes:b})}let v=this.sceneManager.getAllScenes().find(b=>b.filePath===o.filePath);v&&this.show(v)})}):s.createSpan({cls:"inspector-sp-empty",text:"None"}),e.createEl("button",{cls:"story-line-chip inspector-sp-add",text:"+ Link payoff scene"}).addEventListener("click",()=>{this.openScenePicker(o,"payoff")});let i=e.createDiv("inspector-sp-row"),l=i.createSpan();Y.setIcon(l,"arrow-left"),i.createSpan({text:" Set up by:",cls:"inspector-sp-label"});let d=e.createDiv("inspector-sp-list");if((f=o.setup_scenes)!=null&&f.length?o.setup_scenes.forEach(u=>{let h=d.createDiv("inspector-sp-chip");h.createSpan({text:u.replace(/^\[\[|\]\]$/g,"")}),h.createEl("button",{cls:"inspector-sp-remove clickable-icon",text:"\xD7"}).addEventListener("click",async()=>{var M;let x=(o.setup_scenes||[]).filter(b=>b!==u);await this.sceneManager.updateScene(o.filePath,{setup_scenes:x});let m=this.sceneManager.getAllScenes().find(b=>b.title===u);if(m&&((M=m.payoff_scenes)!=null&&M.includes(o.title))){let b=m.payoff_scenes.filter(A=>A!==o.title);await this.sceneManager.updateScene(m.filePath,{payoff_scenes:b})}let v=this.sceneManager.getAllScenes().find(b=>b.filePath===o.filePath);v&&this.show(v)})}):d.createSpan({cls:"inspector-sp-empty",text:"None"}),e.createEl("button",{cls:"story-line-chip inspector-sp-add",text:"+ Link setup scene"}).addEventListener("click",()=>{this.openScenePicker(o,"setup")}),(g=o.payoff_scenes)!=null&&g.length){let u=this.sceneManager.getAllScenes(),h=o.payoff_scenes.filter(y=>!u.find(m=>m.title===y));if(h.length>0){let y=e.createDiv("inspector-sp-warning"),x=y.createSpan();Y.setIcon(x,"alert-triangle"),y.createSpan({text:` Missing payoff target: ${h.join(", ")}`})}}}openScenePicker(o,e){let a=this.sceneManager.getAllScenes().filter(s=>s.filePath!==o.filePath);new e8(this.plugin.app,a,async s=>{if(e==="payoff"){let i=o.payoff_scenes?[...o.payoff_scenes]:[];i.includes(s.title)||(i.push(s.title),await this.sceneManager.updateScene(o.filePath,{payoff_scenes:i}));let l=s.setup_scenes?[...s.setup_scenes]:[];l.includes(o.title)||(l.push(o.title),await this.sceneManager.updateScene(s.filePath,{setup_scenes:l}))}else{let i=o.setup_scenes?[...o.setup_scenes]:[];i.includes(s.title)||(i.push(s.title),await this.sceneManager.updateScene(o.filePath,{setup_scenes:i}));let l=s.payoff_scenes?[...s.payoff_scenes]:[];l.includes(o.title)||(l.push(o.title),await this.sceneManager.updateScene(s.filePath,{payoff_scenes:l}))}let n=this.sceneManager.getAllScenes().find(i=>i.filePath===o.filePath);n&&this.show(n)}).open()}renderDetectedLinks(o){var g,u;let e=this.plugin.linkScanner,a=(g=e.getResult(o.filePath))!=null?g:e.scan(o);if(a.links.length===0)return;let r=this.plugin.settings.tagTypeOverrides,s=new Set((o.characters||[]).map(h=>h.toLowerCase())),n=(u=o.location)==null?void 0:u.toLowerCase(),i=a.links.filter(h=>{let y=h.name.toLowerCase();return!(h.type==="character"&&s.has(y)||h.type==="location"&&y===n)});if(i.length===0)return;let l=this.container.createDiv("inspector-section inspector-detected-links"),d=l.createDiv("inspector-detected-header"),c=d.createSpan();Y.setIcon(c,"scan-search"),d.createSpan({cls:"inspector-label",text:" Detected in text"});let p=l.createDiv("inspector-detected-pills"),f={character:"user",location:"map-pin",prop:"gem",other:"file-text"};for(let h of i){let y=h.name.toLowerCase(),x=r[y]||h.type,m=p.createDiv(`inspector-detected-pill detected-type-${x}`);r[y]&&m.addClass("tag-overridden");let v=m.createSpan({cls:"inspector-detected-icon"});Y.setIcon(v,f[x]||"file-text"),m.createSpan({text:h.name}),m.addEventListener("contextmenu",M=>{M.preventDefault(),M.stopPropagation(),this.showTagTypeMenu(M,h.name,()=>{this.currentScene&&this.render()})})}}showTagTypeMenu(o,e,a){let r=e.toLowerCase(),s=this.plugin.settings.tagTypeOverrides[r],n=[{label:"Prop",value:"prop",icon:"gem"},{label:"Location",value:"location",icon:"map-pin"},{label:"Character",value:"character",icon:"user"},{label:"Other",value:"other",icon:"file-text"},{label:"Reset to Auto",value:null,icon:"rotate-ccw"}],i=new Y.Menu;i.addItem(l=>l.setTitle(e).setDisabled(!0)),i.addSeparator();for(let l of n)i.addItem(d=>{d.setTitle(l.label).setIcon(l.icon).setChecked(l.value!==null&&s===l.value).onClick(async()=>{l.value===null?delete this.plugin.settings.tagTypeOverrides[r]:this.plugin.settings.tagTypeOverrides[r]=l.value,await this.plugin.saveSettings(),a()})});i.showAtMouseEvent(o)}renderNotes(o){let e=this.container.createDiv("inspector-section inspector-notes"),a=e.createDiv("inspector-notes-header"),r=a.createSpan();Y.setIcon(r,"message-square"),a.createSpan({cls:"inspector-label",text:" Notes / Comments"});let s=e.createEl("textarea",{cls:"inspector-notes-textarea",attr:{placeholder:"Add revision notes or editorial comments\u2026",rows:"4"}});s.value=o.notes||"";let n;s.addEventListener("input",()=>{clearTimeout(n),n=setTimeout(async()=>{let i=s.value.trim();await this.sceneManager.updateScene(o.filePath,{notes:i||void 0}),o.notes=i||void 0},600)})}renderSnapshots(o){let e=this.container.createDiv("inspector-section inspector-snapshots"),a=e.createDiv("inspector-snapshots-header"),r=a.createSpan();Y.setIcon(r,"history"),a.createSpan({cls:"inspector-label",text:" Snapshots"});let s=a.createEl("button",{cls:"inspector-snapshot-save-btn clickable-icon",attr:{title:"Save snapshot"}});Y.setIcon(s,"save");let n=e.createDiv("inspector-snapshot-list"),i=this.plugin.snapshotManager,l=async()=>{n.empty();let d=await i.listSnapshots(o.filePath);if(d.length===0){n.createSpan({cls:"inspector-sp-empty",text:"No snapshots yet"});return}for(let c of d){let p=n.createDiv("inspector-snapshot-row"),f=p.createDiv("inspector-snapshot-info");f.createSpan({cls:"inspector-snapshot-label",text:c.label});let g=c.timestamp.split("T")[0],u=c.wordcount?` \xB7 ${c.wordcount}w`:"";f.createSpan({cls:"inspector-snapshot-meta",text:`${g}${u}`});let h=p.createDiv("inspector-snapshot-btns"),y=h.createEl("button",{cls:"clickable-icon",attr:{title:"Restore this snapshot"}});Y.setIcon(y,"undo-2"),y.addEventListener("click",()=>{ct(this.plugin.app,{title:"Restore Snapshot",message:`Replace scene with snapshot "${c.label}"? Save a snapshot first to avoid losing current content.`,confirmLabel:"Restore",onConfirm:async()=>{await i.restoreSnapshot(c.filePath,o.filePath);let m=this.sceneManager.getAllScenes().find(v=>v.filePath===o.filePath);m&&this.show(m)}})});let x=h.createEl("button",{cls:"clickable-icon",attr:{title:"Delete snapshot"}});Y.setIcon(x,"trash-2"),x.addEventListener("click",async()=>{await i.deleteSnapshot(c.filePath),await l()})}};s.addEventListener("click",()=>{new a8(this.plugin.app,async c=>{await i.saveSnapshot(o.filePath,c),await l()}).open()}),l()}getLocationNames(){let o=new Map,e=this.plugin.locationManager;if(e)for(let r of e.getAllLocations()){let s=r.name.toLowerCase();o.has(s)||o.set(s,r.name)}let a=this.sceneManager.getUniqueValues("location");for(let r of a){let s=r.toLowerCase();o.has(s)||o.set(s,r)}return Array.from(o.values()).sort((r,s)=>r.toLowerCase().localeCompare(s.toLowerCase()))}},e8=class extends pa.FuzzySuggestModal{constructor(o,e,a){super(o),this.scenes=e,this.onChoose=a,this.setPlaceholder("Search for a scene\u2026")}getItems(){return this.scenes}getItemText(o){return`${o.act!==void 0?`Act ${o.act} \u2014 `:""}${o.title||"Untitled"}`}onChooseItem(o){this.onChoose(o)}},a8=class extends pa.Modal{constructor(o,e){super(o),this.onSubmit=e}onOpen(){let{contentEl:o}=this;o.createEl("h3",{text:"Save Snapshot"}),o.createEl("p",{text:'Enter a name for this snapshot (e.g. "before major rewrite")'});let e=o.createEl("input",{attr:{type:"text",placeholder:"Snapshot label\u2026"},cls:"snapshot-label-input"});e.style.width="100%",e.style.marginBottom="12px",setTimeout(()=>e.focus(),50);let a=o.createDiv({cls:"snapshot-label-btns"});a.style.display="flex",a.style.gap="8px",a.style.justifyContent="flex-end",a.createEl("button",{text:"Cancel"}).addEventListener("click",()=>this.close());let s=a.createEl("button",{text:"Save",cls:"mod-cta"}),n=()=>{let i=e.value.trim()||`Snapshot ${new Date().toLocaleDateString()}`;this.onSubmit(i),this.close()};s.addEventListener("click",n),e.addEventListener("keydown",i=>{i.key==="Enter"&&n()})}onClose(){this.contentEl.empty()}};var tt=require("obsidian");var ut=class extends tt.Modal{constructor(e,a,r,s){super(e);this.result={};this.conflictSameAsDescription=!1;this.selectedTemplate=null;this.plugin=a,this.sceneManager=r,this.onSubmit=s,this.result.status=a.settings.defaultStatus}onOpen(){let{contentEl:e}=this;e.addClass("story-line-quick-add"),e.createEl("h2",{text:"Create New Scene"});let a=[...u8,...this.plugin.settings.sceneTemplates];new tt.Setting(e).setName("Template").setDesc("Pre-fill fields and body from a template").addDropdown(m=>{m.addOption("","(none)"),a.forEach((v,M)=>m.addOption(String(M),v.name)),m.onChange(v=>{v===""?this.selectedTemplate=null:this.selectedTemplate=a[Number(v)]})}),new tt.Setting(e).setName("Title").addText(m=>{m.setPlaceholder("Scene title...").onChange(v=>this.result.title=v),m.inputEl.addClass("story-line-title-input"),setTimeout(()=>m.inputEl.focus(),50)});let r=e.createDiv({cls:"story-line-act-chapter-row"}),s=r.createDiv({cls:"story-line-field-group"});s.createEl("label",{text:"Act",cls:"story-line-field-label"});let n=s.createEl("select",{cls:"dropdown story-line-field-input"});n.createEl("option",{text:"None",value:""});for(let m=1;m<=5;m++)n.createEl("option",{text:`Act ${m}`,value:String(m)});n.addEventListener("change",()=>{this.result.act=n.value?Number(n.value):void 0});let i=r.createDiv({cls:"story-line-field-group"});i.createEl("label",{text:"Chapter",cls:"story-line-field-label"});let l=i.createEl("input",{type:"text",cls:"story-line-field-input",placeholder:"Chapter #"});l.addEventListener("input",()=>{let m=l.value;this.result.chapter=m?Number(m)||m:void 0}),new tt.Setting(e).setName("POV Character").addDropdown(m=>{m.addOption("","None"),this.sceneManager.getAllCharacters().forEach(M=>m.addOption(M,M)),m.onChange(M=>this.result.pov=M||void 0)}).addExtraButton(m=>{m.setIcon("plus").setTooltip("Type a new character name").onClick(()=>{let v=e.createEl("input",{attr:{type:"text",placeholder:"New character name..."}});v.addEventListener("change",()=>{this.result.pov=v.value})})}),new tt.Setting(e).setName("Location").addDropdown(m=>{m.addOption("","None"),this.getLocationNames().forEach(M=>m.addOption(M,M)),m.onChange(M=>this.result.location=M||void 0)}).addExtraButton(m=>{m.setIcon("plus").setTooltip("Type a new location name").onClick(()=>{let v=e.createEl("input",{attr:{type:"text",placeholder:"New location name..."}});v.addEventListener("change",()=>{this.result.location=v.value||void 0})})}),new tt.Setting(e).setName("Characters").addTextArea(m=>{m.setPlaceholder("Anna, Marcus, ...").onChange(v=>{this.result.characters=v?v.split(",").map(M=>M.trim()).filter(Boolean):void 0}),m.inputEl.rows=2,m.inputEl.addClass("story-line-wide-input")}),new tt.Setting(e).setName("Description").addTextArea(m=>{m.setPlaceholder("Describe the scene...").onChange(v=>this.result.description=v||void 0),m.inputEl.rows=3,m.inputEl.addClass("story-line-wide-input")});let d=e.createDiv("story-line-conflict-section"),p=d.createDiv("story-line-conflict-header").createEl("label",{cls:"story-line-conflict-toggle"}),f=p.createEl("input",{attr:{type:"checkbox"}});p.createSpan({text:"Same as description"});let g=new tt.Setting(d).setName("Conflict").addTextArea(m=>{m.setPlaceholder("What is the main conflict?").onChange(v=>this.result.conflict=v||void 0),m.inputEl.rows=2,m.inputEl.addClass("story-line-wide-input")});f.addEventListener("change",()=>{this.conflictSameAsDescription=f.checked,g.settingEl.style.display=f.checked?"none":""}),new tt.Setting(e).setName("Tags / Plotlines").addText(m=>{m.setPlaceholder("plotline/main, theme/courage, ...").onChange(v=>{this.result.tags=v?v.split(",").map(M=>M.trim()).filter(Boolean):void 0})}),new tt.Setting(e).setName("Status").addDropdown(m=>{["idea","outlined","draft","written","revised","final"].forEach(M=>m.addOption(M,M.charAt(0).toUpperCase()+M.slice(1))),m.setValue(this.result.status||"idea"),m.onChange(M=>this.result.status=M)});let u=e.createDiv("story-line-button-row");u.createEl("button",{text:"Cancel"}).addEventListener("click",()=>this.close()),u.createEl("button",{text:"Create & Edit",cls:"mod-cta"}).addEventListener("click",()=>{if(!this.result.title){new tt.Notice("Please enter a scene title");return}this.prepareResult(),this.onSubmit(this.result,!0),this.close()}),u.createEl("button",{text:"Create"}).addEventListener("click",()=>{if(!this.result.title){new tt.Notice("Please enter a scene title");return}this.prepareResult(),this.onSubmit(this.result,!1),this.close()})}prepareResult(){var a,r;if(this.selectedTemplate){let s=this.selectedTemplate.defaultFields;s.status&&!this.result.status&&(this.result.status=s.status),s.emotion&&!this.result.emotion&&(this.result.emotion=s.emotion),s.conflict&&!this.result.conflict&&(this.result.conflict=s.conflict),s.target_wordcount&&!this.result.target_wordcount&&(this.result.target_wordcount=s.target_wordcount),(a=s.tags)!=null&&a.length&&(!this.result.tags||this.result.tags.length===0)&&(this.result.tags=[...s.tags])}let e=this.result.description;if(e&&(this.result.body=e,this.conflictSameAsDescription&&(this.result.conflict=e),delete this.result.description),(r=this.selectedTemplate)!=null&&r.bodyTemplate){let s=this.result.body||"",n=s?`

`:"";this.result.body=s+n+this.selectedTemplate.bodyTemplate}}onClose(){let{contentEl:e}=this;e.empty()}getLocationNames(){let e=new Map,a=this.plugin.locationManager;if(a)for(let s of a.getAllLocations()){let n=s.name.toLowerCase();e.has(n)||e.set(n,s.name)}let r=this.sceneManager.getUniqueValues("location");for(let s of r){let n=s.toLowerCase();e.has(n)||e.set(n,s)}return Array.from(e.values()).sort((s,n)=>s.toLowerCase().localeCompare(n.toLowerCase()))}};var o8={};K6(o8,{AArrowDown:()=>ha,AArrowUp:()=>ua,ALargeSmall:()=>ma,Accessibility:()=>xa,Activity:()=>va,ActivitySquare:()=>ga,AirVent:()=>ya,Airplay:()=>Ma,AlarmClock:()=>Sa,AlarmClockCheck:()=>$t,AlarmClockMinus:()=>Ot,AlarmClockOff:()=>ba,AlarmClockPlus:()=>Nt,AlarmSmoke:()=>Aa,Album:()=>wa,AlertCircle:()=>Ca,AlertOctagon:()=>La,AlertTriangle:()=>Ea,AlignCenter:()=>Ta,AlignCenterHorizontal:()=>ka,AlignCenterVertical:()=>Pa,AlignEndHorizontal:()=>Da,AlignEndVertical:()=>Ha,AlignHorizontalDistributeCenter:()=>Fa,AlignHorizontalDistributeEnd:()=>Va,AlignHorizontalDistributeStart:()=>Ba,AlignHorizontalJustifyCenter:()=>Ra,AlignHorizontalJustifyEnd:()=>Ia,AlignHorizontalJustifyStart:()=>$a,AlignHorizontalSpaceAround:()=>Oa,AlignHorizontalSpaceBetween:()=>Na,AlignJustify:()=>qa,AlignLeft:()=>Wa,AlignRight:()=>Za,AlignStartHorizontal:()=>Ua,AlignStartVertical:()=>Ga,AlignVerticalDistributeCenter:()=>_a,AlignVerticalDistributeEnd:()=>za,AlignVerticalDistributeStart:()=>ja,AlignVerticalJustifyCenter:()=>Xa,AlignVerticalJustifyEnd:()=>Ka,AlignVerticalJustifyStart:()=>Ya,AlignVerticalSpaceAround:()=>Ja,AlignVerticalSpaceBetween:()=>Qa,Ambulance:()=>tr,Ampersand:()=>er,Ampersands:()=>ar,Anchor:()=>rr,Angry:()=>or,Annoyed:()=>sr,Antenna:()=>ir,Anvil:()=>nr,Aperture:()=>lr,AppWindow:()=>dr,Apple:()=>cr,Archive:()=>hr,ArchiveRestore:()=>pr,ArchiveX:()=>fr,AreaChart:()=>ur,Armchair:()=>mr,ArrowBigDown:()=>gr,ArrowBigDownDash:()=>xr,ArrowBigLeft:()=>yr,ArrowBigLeftDash:()=>vr,ArrowBigRight:()=>br,ArrowBigRightDash:()=>Mr,ArrowBigUp:()=>Ar,ArrowBigUpDash:()=>Sr,ArrowDown:()=>qr,ArrowDown01:()=>wr,ArrowDown10:()=>Cr,ArrowDownAZ:()=>qt,ArrowDownCircle:()=>Lr,ArrowDownFromLine:()=>Er,ArrowDownLeft:()=>Dr,ArrowDownLeftFromCircle:()=>kr,ArrowDownLeftFromSquare:()=>Pr,ArrowDownLeftSquare:()=>Tr,ArrowDownNarrowWide:()=>Hr,ArrowDownRight:()=>Rr,ArrowDownRightFromCircle:()=>Fr,ArrowDownRightFromSquare:()=>Vr,ArrowDownRightSquare:()=>Br,ArrowDownSquare:()=>Ir,ArrowDownToDot:()=>$r,ArrowDownToLine:()=>Or,ArrowDownUp:()=>Nr,ArrowDownWideNarrow:()=>Wt,ArrowDownZA:()=>Zt,ArrowLeft:()=>zr,ArrowLeftCircle:()=>Wr,ArrowLeftFromLine:()=>Zr,ArrowLeftRight:()=>Ur,ArrowLeftSquare:()=>Gr,ArrowLeftToLine:()=>_r,ArrowRight:()=>Qr,ArrowRightCircle:()=>jr,ArrowRightFromLine:()=>Xr,ArrowRightLeft:()=>Kr,ArrowRightSquare:()=>Yr,ArrowRightToLine:()=>Jr,ArrowUp:()=>vo,ArrowUp01:()=>to,ArrowUp10:()=>eo,ArrowUpAZ:()=>Ut,ArrowUpCircle:()=>ao,ArrowUpDown:()=>ro,ArrowUpFromDot:()=>oo,ArrowUpFromLine:()=>so,ArrowUpLeft:()=>co,ArrowUpLeftFromCircle:()=>io,ArrowUpLeftFromSquare:()=>no,ArrowUpLeftSquare:()=>lo,ArrowUpNarrowWide:()=>Gt,ArrowUpRight:()=>uo,ArrowUpRightFromCircle:()=>po,ArrowUpRightFromSquare:()=>fo,ArrowUpRightSquare:()=>ho,ArrowUpSquare:()=>mo,ArrowUpToLine:()=>xo,ArrowUpWideNarrow:()=>go,ArrowUpZA:()=>_t,ArrowsUpFromLine:()=>yo,Asterisk:()=>Mo,AsteriskSquare:()=>zt,AtSign:()=>bo,Atom:()=>So,AudioLines:()=>Ao,AudioWaveform:()=>wo,Award:()=>Co,Axe:()=>Lo,Axis3d:()=>jt,Baby:()=>Eo,Backpack:()=>ko,Badge:()=>Uo,BadgeAlert:()=>Po,BadgeCent:()=>To,BadgeCheck:()=>Xt,BadgeDollarSign:()=>Do,BadgeEuro:()=>Ho,BadgeHelp:()=>Fo,BadgeIndianRupee:()=>Vo,BadgeInfo:()=>Bo,BadgeJapaneseYen:()=>Ro,BadgeMinus:()=>Io,BadgePercent:()=>$o,BadgePlus:()=>Oo,BadgePoundSterling:()=>No,BadgeRussianRuble:()=>qo,BadgeSwissFranc:()=>Wo,BadgeX:()=>Zo,BaggageClaim:()=>Go,Ban:()=>_o,Banana:()=>zo,Banknote:()=>jo,BarChart:()=>es,BarChart2:()=>Xo,BarChart3:()=>Ko,BarChart4:()=>Yo,BarChartBig:()=>Jo,BarChartHorizontal:()=>ts,BarChartHorizontalBig:()=>Qo,Barcode:()=>as,Baseline:()=>rs,Bath:()=>os,Battery:()=>cs,BatteryCharging:()=>ss,BatteryFull:()=>is,BatteryLow:()=>ns,BatteryMedium:()=>ls,BatteryWarning:()=>ds,Beaker:()=>ps,Bean:()=>hs,BeanOff:()=>fs,Bed:()=>xs,BedDouble:()=>us,BedSingle:()=>ms,Beef:()=>gs,Beer:()=>vs,Bell:()=>Cs,BellDot:()=>ys,BellElectric:()=>Ms,BellMinus:()=>bs,BellOff:()=>Ss,BellPlus:()=>As,BellRing:()=>ws,BetweenHorizontalEnd:()=>Kt,BetweenHorizontalStart:()=>Yt,BetweenVerticalEnd:()=>Ls,BetweenVerticalStart:()=>Es,Bike:()=>ks,Binary:()=>Ps,Biohazard:()=>Ts,Bird:()=>Ds,Bitcoin:()=>Hs,Blend:()=>Fs,Blinds:()=>Vs,Blocks:()=>Bs,Bluetooth:()=>Os,BluetoothConnected:()=>Rs,BluetoothOff:()=>Is,BluetoothSearching:()=>$s,Bold:()=>Ns,Bolt:()=>qs,Bomb:()=>Ws,Bone:()=>Zs,Book:()=>fi,BookA:()=>Us,BookAudio:()=>Gs,BookCheck:()=>_s,BookCopy:()=>zs,BookDashed:()=>Jt,BookDown:()=>js,BookHeadphones:()=>Xs,BookHeart:()=>Ks,BookImage:()=>Ys,BookKey:()=>Js,BookLock:()=>Qs,BookMarked:()=>ti,BookMinus:()=>ei,BookOpen:()=>oi,BookOpenCheck:()=>ai,BookOpenText:()=>ri,BookPlus:()=>si,BookText:()=>ii,BookType:()=>ni,BookUp:()=>di,BookUp2:()=>li,BookUser:()=>ci,BookX:()=>pi,Bookmark:()=>gi,BookmarkCheck:()=>hi,BookmarkMinus:()=>ui,BookmarkPlus:()=>mi,BookmarkX:()=>xi,BoomBox:()=>vi,Bot:()=>yi,Box:()=>bi,BoxSelect:()=>Mi,Boxes:()=>Si,Braces:()=>Qt,Brackets:()=>Ai,Brain:()=>Li,BrainCircuit:()=>wi,BrainCog:()=>Ci,BrickWall:()=>Ei,Briefcase:()=>ki,BringToFront:()=>Pi,Brush:()=>Ti,Bug:()=>Fi,BugOff:()=>Di,BugPlay:()=>Hi,Building:()=>Bi,Building2:()=>Vi,Bus:()=>Ii,BusFront:()=>Ri,Cable:()=>Oi,CableCar:()=>$i,Cake:()=>qi,CakeSlice:()=>Ni,Calculator:()=>Wi,Calendar:()=>on,CalendarCheck:()=>Ui,CalendarCheck2:()=>Zi,CalendarClock:()=>Gi,CalendarDays:()=>_i,CalendarFold:()=>zi,CalendarHeart:()=>ji,CalendarMinus:()=>Ki,CalendarMinus2:()=>Xi,CalendarOff:()=>Yi,CalendarPlus:()=>Qi,CalendarPlus2:()=>Ji,CalendarRange:()=>tn,CalendarSearch:()=>en,CalendarX:()=>rn,CalendarX2:()=>an,Camera:()=>nn,CameraOff:()=>sn,CandlestickChart:()=>ln,Candy:()=>pn,CandyCane:()=>dn,CandyOff:()=>cn,Captions:()=>te,CaptionsOff:()=>fn,Car:()=>mn,CarFront:()=>hn,CarTaxiFront:()=>un,Caravan:()=>xn,Carrot:()=>gn,CaseLower:()=>vn,CaseSensitive:()=>yn,CaseUpper:()=>Mn,CassetteTape:()=>bn,Cast:()=>Sn,Castle:()=>An,Cat:()=>wn,Cctv:()=>Cn,Check:()=>Dn,CheckCheck:()=>Ln,CheckCircle:()=>kn,CheckCircle2:()=>En,CheckSquare:()=>Tn,CheckSquare2:()=>Pn,ChefHat:()=>Hn,Cherry:()=>Fn,ChevronDown:()=>Rn,ChevronDownCircle:()=>Vn,ChevronDownSquare:()=>Bn,ChevronFirst:()=>In,ChevronLast:()=>$n,ChevronLeft:()=>qn,ChevronLeftCircle:()=>On,ChevronLeftSquare:()=>Nn,ChevronRight:()=>Un,ChevronRightCircle:()=>Wn,ChevronRightSquare:()=>Zn,ChevronUp:()=>zn,ChevronUpCircle:()=>Gn,ChevronUpSquare:()=>_n,ChevronsDown:()=>Xn,ChevronsDownUp:()=>jn,ChevronsLeft:()=>Yn,ChevronsLeftRight:()=>Kn,ChevronsRight:()=>Qn,ChevronsRightLeft:()=>Jn,ChevronsUp:()=>el,ChevronsUpDown:()=>tl,Chrome:()=>al,Church:()=>rl,Cigarette:()=>sl,CigaretteOff:()=>ol,Circle:()=>ml,CircleDashed:()=>il,CircleDollarSign:()=>nl,CircleDot:()=>dl,CircleDotDashed:()=>ll,CircleEllipsis:()=>cl,CircleEqual:()=>pl,CircleFadingPlus:()=>fl,CircleOff:()=>hl,CircleSlash:()=>ul,CircleSlash2:()=>ee,CircleUser:()=>re,CircleUserRound:()=>ae,CircuitBoard:()=>xl,Citrus:()=>gl,Clapperboard:()=>vl,Clipboard:()=>El,ClipboardCheck:()=>yl,ClipboardCopy:()=>Ml,ClipboardList:()=>bl,ClipboardMinus:()=>Sl,ClipboardPaste:()=>Al,ClipboardPen:()=>se,ClipboardPenLine:()=>oe,ClipboardPlus:()=>wl,ClipboardType:()=>Cl,ClipboardX:()=>Ll,Clock:()=>Nl,Clock1:()=>kl,Clock10:()=>Pl,Clock11:()=>Tl,Clock12:()=>Dl,Clock2:()=>Hl,Clock3:()=>Fl,Clock4:()=>Vl,Clock5:()=>Bl,Clock6:()=>Rl,Clock7:()=>Il,Clock8:()=>$l,Clock9:()=>Ol,Cloud:()=>td,CloudCog:()=>ql,CloudDrizzle:()=>Wl,CloudFog:()=>Zl,CloudHail:()=>Ul,CloudLightning:()=>Gl,CloudMoon:()=>zl,CloudMoonRain:()=>_l,CloudOff:()=>jl,CloudRain:()=>Kl,CloudRainWind:()=>Xl,CloudSnow:()=>Yl,CloudSun:()=>Ql,CloudSunRain:()=>Jl,Cloudy:()=>ed,Clover:()=>ad,Club:()=>rd,Code:()=>sd,Code2:()=>od,CodeSquare:()=>ie,Codepen:()=>id,Codesandbox:()=>nd,Coffee:()=>ld,Cog:()=>dd,Coins:()=>cd,Columns2:()=>ne,Columns3:()=>le,Columns4:()=>pd,Combine:()=>fd,Command:()=>hd,Compass:()=>ud,Component:()=>md,Computer:()=>xd,ConciergeBell:()=>gd,Cone:()=>vd,Construction:()=>yd,Contact:()=>bd,Contact2:()=>Md,Container:()=>Sd,Contrast:()=>Ad,Cookie:()=>wd,CookingPot:()=>Cd,Copy:()=>Dd,CopyCheck:()=>Ld,CopyMinus:()=>Ed,CopyPlus:()=>kd,CopySlash:()=>Pd,CopyX:()=>Td,Copyleft:()=>Hd,Copyright:()=>Fd,CornerDownLeft:()=>Vd,CornerDownRight:()=>Bd,CornerLeftDown:()=>Rd,CornerLeftUp:()=>Id,CornerRightDown:()=>$d,CornerRightUp:()=>Od,CornerUpLeft:()=>Nd,CornerUpRight:()=>qd,Cpu:()=>Wd,CreativeCommons:()=>Zd,CreditCard:()=>Ud,Croissant:()=>Gd,Crop:()=>_d,Cross:()=>zd,Crosshair:()=>jd,Crown:()=>Xd,Cuboid:()=>Kd,CupSoda:()=>Yd,Currency:()=>Jd,Cylinder:()=>Qd,Database:()=>ac,DatabaseBackup:()=>tc,DatabaseZap:()=>ec,Delete:()=>rc,Dessert:()=>oc,Diameter:()=>sc,Diamond:()=>ic,Dice1:()=>nc,Dice2:()=>lc,Dice3:()=>dc,Dice4:()=>cc,Dice5:()=>pc,Dice6:()=>fc,Dices:()=>hc,Diff:()=>uc,Disc:()=>vc,Disc2:()=>mc,Disc3:()=>xc,DiscAlbum:()=>gc,Divide:()=>bc,DivideCircle:()=>yc,DivideSquare:()=>Mc,Dna:()=>Ac,DnaOff:()=>Sc,Dog:()=>wc,DollarSign:()=>Cc,Donut:()=>Lc,DoorClosed:()=>Ec,DoorOpen:()=>kc,Dot:()=>Pc,DotSquare:()=>de,Download:()=>Dc,DownloadCloud:()=>Tc,DraftingCompass:()=>Hc,Drama:()=>Fc,Dribbble:()=>Vc,Drill:()=>Bc,Droplet:()=>Rc,Droplets:()=>Ic,Drum:()=>$c,Drumstick:()=>Oc,Dumbbell:()=>Nc,Ear:()=>Wc,EarOff:()=>qc,Eclipse:()=>Zc,Egg:()=>_c,EggFried:()=>Uc,EggOff:()=>Gc,Equal:()=>jc,EqualNot:()=>zc,EqualSquare:()=>ce,Eraser:()=>Xc,Euro:()=>Kc,Expand:()=>Yc,ExternalLink:()=>Jc,Eye:()=>t1,EyeOff:()=>Qc,Facebook:()=>e1,Factory:()=>a1,Fan:()=>r1,FastForward:()=>o1,Feather:()=>s1,Fence:()=>i1,FerrisWheel:()=>n1,Figma:()=>l1,File:()=>lp,FileArchive:()=>d1,FileAudio:()=>p1,FileAudio2:()=>c1,FileAxis3d:()=>pe,FileBadge:()=>h1,FileBadge2:()=>f1,FileBarChart:()=>m1,FileBarChart2:()=>u1,FileBox:()=>x1,FileCheck:()=>v1,FileCheck2:()=>g1,FileClock:()=>y1,FileCode:()=>b1,FileCode2:()=>M1,FileCog:()=>fe,FileDiff:()=>S1,FileDigit:()=>A1,FileDown:()=>w1,FileHeart:()=>C1,FileImage:()=>L1,FileInput:()=>E1,FileJson:()=>P1,FileJson2:()=>k1,FileKey:()=>D1,FileKey2:()=>T1,FileLineChart:()=>H1,FileLock:()=>V1,FileLock2:()=>F1,FileMinus:()=>R1,FileMinus2:()=>B1,FileMusic:()=>I1,FileOutput:()=>$1,FilePen:()=>ue,FilePenLine:()=>he,FilePieChart:()=>O1,FilePlus:()=>q1,FilePlus2:()=>N1,FileQuestion:()=>W1,FileScan:()=>Z1,FileSearch:()=>G1,FileSearch2:()=>U1,FileSliders:()=>_1,FileSpreadsheet:()=>z1,FileStack:()=>j1,FileSymlink:()=>X1,FileTerminal:()=>K1,FileText:()=>Y1,FileType:()=>Q1,FileType2:()=>J1,FileUp:()=>tp,FileVideo:()=>ap,FileVideo2:()=>ep,FileVolume:()=>op,FileVolume2:()=>rp,FileWarning:()=>sp,FileX:()=>np,FileX2:()=>ip,Files:()=>dp,Film:()=>cp,Filter:()=>fp,FilterX:()=>pp,Fingerprint:()=>hp,FireExtinguisher:()=>up,Fish:()=>gp,FishOff:()=>mp,FishSymbol:()=>xp,Flag:()=>bp,FlagOff:()=>vp,FlagTriangleLeft:()=>yp,FlagTriangleRight:()=>Mp,Flame:()=>Ap,FlameKindling:()=>Sp,Flashlight:()=>Cp,FlashlightOff:()=>wp,FlaskConical:()=>Ep,FlaskConicalOff:()=>Lp,FlaskRound:()=>kp,FlipHorizontal:()=>Tp,FlipHorizontal2:()=>Pp,FlipVertical:()=>Hp,FlipVertical2:()=>Dp,Flower:()=>Vp,Flower2:()=>Fp,Focus:()=>Bp,FoldHorizontal:()=>Rp,FoldVertical:()=>Ip,Folder:()=>c2,FolderArchive:()=>$p,FolderCheck:()=>Op,FolderClock:()=>Np,FolderClosed:()=>qp,FolderCog:()=>me,FolderDot:()=>Wp,FolderDown:()=>Zp,FolderGit:()=>Gp,FolderGit2:()=>Up,FolderHeart:()=>_p,FolderInput:()=>zp,FolderKanban:()=>jp,FolderKey:()=>Xp,FolderLock:()=>Kp,FolderMinus:()=>Yp,FolderOpen:()=>Qp,FolderOpenDot:()=>Jp,FolderOutput:()=>t2,FolderPen:()=>xe,FolderPlus:()=>e2,FolderRoot:()=>a2,FolderSearch:()=>o2,FolderSearch2:()=>r2,FolderSymlink:()=>s2,FolderSync:()=>i2,FolderTree:()=>n2,FolderUp:()=>l2,FolderX:()=>d2,Folders:()=>p2,Footprints:()=>f2,Forklift:()=>h2,FormInput:()=>u2,Forward:()=>m2,Frame:()=>x2,Framer:()=>g2,Frown:()=>v2,Fuel:()=>y2,Fullscreen:()=>M2,FunctionSquare:()=>b2,GalleryHorizontal:()=>A2,GalleryHorizontalEnd:()=>S2,GalleryThumbnails:()=>w2,GalleryVertical:()=>L2,GalleryVerticalEnd:()=>C2,Gamepad:()=>k2,Gamepad2:()=>E2,GanttChart:()=>P2,GanttChartSquare:()=>Pt,Gauge:()=>D2,GaugeCircle:()=>T2,Gavel:()=>H2,Gem:()=>F2,Ghost:()=>V2,Gift:()=>B2,GitBranch:()=>I2,GitBranchPlus:()=>R2,GitCommitHorizontal:()=>ge,GitCommitVertical:()=>$2,GitCompare:()=>N2,GitCompareArrows:()=>O2,GitFork:()=>q2,GitGraph:()=>W2,GitMerge:()=>Z2,GitPullRequest:()=>X2,GitPullRequestArrow:()=>U2,GitPullRequestClosed:()=>G2,GitPullRequestCreate:()=>z2,GitPullRequestCreateArrow:()=>_2,GitPullRequestDraft:()=>j2,Github:()=>K2,Gitlab:()=>Y2,GlassWater:()=>J2,Glasses:()=>Q2,Globe:()=>ef,Globe2:()=>tf,Goal:()=>af,Grab:()=>rf,GraduationCap:()=>of,Grape:()=>sf,Grid2x2:()=>ve,Grid3x3:()=>Tt,Grip:()=>df,GripHorizontal:()=>nf,GripVertical:()=>lf,Group:()=>cf,Guitar:()=>pf,Hammer:()=>ff,Hand:()=>gf,HandCoins:()=>hf,HandHeart:()=>uf,HandHelping:()=>ye,HandMetal:()=>mf,HandPlatter:()=>xf,Handshake:()=>vf,HardDrive:()=>bf,HardDriveDownload:()=>yf,HardDriveUpload:()=>Mf,HardHat:()=>Sf,Hash:()=>Af,Haze:()=>wf,HdmiPort:()=>Cf,Heading:()=>Hf,Heading1:()=>Lf,Heading2:()=>Ef,Heading3:()=>kf,Heading4:()=>Pf,Heading5:()=>Tf,Heading6:()=>Df,Headphones:()=>Ff,Headset:()=>Vf,Heart:()=>Of,HeartCrack:()=>Bf,HeartHandshake:()=>Rf,HeartOff:()=>If,HeartPulse:()=>$f,Heater:()=>Nf,HelpCircle:()=>qf,Hexagon:()=>Wf,Highlighter:()=>Zf,History:()=>Uf,Home:()=>Gf,Hop:()=>zf,HopOff:()=>_f,Hotel:()=>jf,Hourglass:()=>Xf,IceCream:()=>Yf,IceCream2:()=>Kf,Image:()=>ah,ImageDown:()=>Jf,ImageMinus:()=>Qf,ImageOff:()=>th,ImagePlus:()=>eh,Images:()=>rh,Import:()=>oh,Inbox:()=>sh,Indent:()=>ih,IndianRupee:()=>nh,Infinity:()=>lh,Info:()=>dh,InspectionPanel:()=>ch,Instagram:()=>ph,Italic:()=>fh,IterationCcw:()=>hh,IterationCw:()=>uh,JapaneseYen:()=>mh,Joystick:()=>xh,Kanban:()=>gh,KanbanSquare:()=>be,KanbanSquareDashed:()=>Me,Key:()=>Mh,KeyRound:()=>vh,KeySquare:()=>yh,Keyboard:()=>Sh,KeyboardMusic:()=>bh,Lamp:()=>kh,LampCeiling:()=>Ah,LampDesk:()=>wh,LampFloor:()=>Ch,LampWallDown:()=>Lh,LampWallUp:()=>Eh,LandPlot:()=>Ph,Landmark:()=>Th,Languages:()=>Dh,Laptop:()=>Fh,Laptop2:()=>Hh,Lasso:()=>Bh,LassoSelect:()=>Vh,Laugh:()=>Rh,Layers:()=>Oh,Layers2:()=>Ih,Layers3:()=>$h,LayoutDashboard:()=>Nh,LayoutGrid:()=>qh,LayoutList:()=>Wh,LayoutPanelLeft:()=>Zh,LayoutPanelTop:()=>Uh,LayoutTemplate:()=>Gh,Leaf:()=>_h,LeafyGreen:()=>zh,Library:()=>Kh,LibraryBig:()=>jh,LibrarySquare:()=>Xh,LifeBuoy:()=>Yh,Ligature:()=>Jh,Lightbulb:()=>tu,LightbulbOff:()=>Qh,LineChart:()=>eu,Link:()=>ou,Link2:()=>ru,Link2Off:()=>au,Linkedin:()=>su,List:()=>Mu,ListChecks:()=>iu,ListCollapse:()=>nu,ListEnd:()=>lu,ListFilter:()=>du,ListMinus:()=>cu,ListMusic:()=>pu,ListOrdered:()=>fu,ListPlus:()=>hu,ListRestart:()=>uu,ListStart:()=>mu,ListTodo:()=>xu,ListTree:()=>gu,ListVideo:()=>vu,ListX:()=>yu,Loader:()=>Su,Loader2:()=>bu,Locate:()=>Cu,LocateFixed:()=>Au,LocateOff:()=>wu,Lock:()=>Eu,LockKeyhole:()=>Lu,LogIn:()=>ku,LogOut:()=>Pu,Lollipop:()=>Tu,Luggage:()=>Du,MSquare:()=>Hu,Magnet:()=>Fu,Mail:()=>Wu,MailCheck:()=>Vu,MailMinus:()=>Bu,MailOpen:()=>Ru,MailPlus:()=>Iu,MailQuestion:()=>$u,MailSearch:()=>Ou,MailWarning:()=>Nu,MailX:()=>qu,Mailbox:()=>Zu,Mails:()=>Uu,Map:()=>ju,MapPin:()=>_u,MapPinOff:()=>Gu,MapPinned:()=>zu,Martini:()=>Xu,Maximize:()=>Yu,Maximize2:()=>Ku,Medal:()=>Ju,Megaphone:()=>t0,MegaphoneOff:()=>Qu,Meh:()=>e0,MemoryStick:()=>a0,Menu:()=>o0,MenuSquare:()=>r0,Merge:()=>s0,MessageCircle:()=>x0,MessageCircleCode:()=>i0,MessageCircleDashed:()=>n0,MessageCircleHeart:()=>l0,MessageCircleMore:()=>d0,MessageCircleOff:()=>c0,MessageCirclePlus:()=>p0,MessageCircleQuestion:()=>f0,MessageCircleReply:()=>h0,MessageCircleWarning:()=>u0,MessageCircleX:()=>m0,MessageSquare:()=>D0,MessageSquareCode:()=>g0,MessageSquareDashed:()=>v0,MessageSquareDiff:()=>y0,MessageSquareDot:()=>M0,MessageSquareHeart:()=>b0,MessageSquareMore:()=>S0,MessageSquareOff:()=>A0,MessageSquarePlus:()=>w0,MessageSquareQuote:()=>C0,MessageSquareReply:()=>L0,MessageSquareShare:()=>E0,MessageSquareText:()=>k0,MessageSquareWarning:()=>P0,MessageSquareX:()=>T0,MessagesSquare:()=>H0,Mic:()=>B0,Mic2:()=>F0,MicOff:()=>V0,Microscope:()=>R0,Microwave:()=>I0,Milestone:()=>$0,Milk:()=>N0,MilkOff:()=>O0,Minimize:()=>W0,Minimize2:()=>q0,Minus:()=>G0,MinusCircle:()=>Z0,MinusSquare:()=>U0,Monitor:()=>rm,MonitorCheck:()=>_0,MonitorDot:()=>z0,MonitorDown:()=>j0,MonitorOff:()=>X0,MonitorPause:()=>K0,MonitorPlay:()=>Y0,MonitorSmartphone:()=>J0,MonitorSpeaker:()=>Q0,MonitorStop:()=>tm,MonitorUp:()=>em,MonitorX:()=>am,Moon:()=>sm,MoonStar:()=>om,MoreHorizontal:()=>im,MoreVertical:()=>nm,Mountain:()=>dm,MountainSnow:()=>lm,Mouse:()=>um,MousePointer:()=>hm,MousePointer2:()=>cm,MousePointerClick:()=>pm,MousePointerSquare:()=>Se,MousePointerSquareDashed:()=>fm,Move:()=>Em,Move3d:()=>Ae,MoveDiagonal:()=>xm,MoveDiagonal2:()=>mm,MoveDown:()=>ym,MoveDownLeft:()=>gm,MoveDownRight:()=>vm,MoveHorizontal:()=>Mm,MoveLeft:()=>bm,MoveRight:()=>Sm,MoveUp:()=>Cm,MoveUpLeft:()=>Am,MoveUpRight:()=>wm,MoveVertical:()=>Lm,Music:()=>Dm,Music2:()=>km,Music3:()=>Pm,Music4:()=>Tm,Navigation:()=>Bm,Navigation2:()=>Fm,Navigation2Off:()=>Hm,NavigationOff:()=>Vm,Network:()=>Rm,Newspaper:()=>Im,Nfc:()=>$m,Notebook:()=>Wm,NotebookPen:()=>Om,NotebookTabs:()=>Nm,NotebookText:()=>qm,NotepadText:()=>Um,NotepadTextDashed:()=>Zm,Nut:()=>_m,NutOff:()=>Gm,Octagon:()=>zm,Option:()=>jm,Orbit:()=>Xm,Outdent:()=>Km,Package:()=>ox,Package2:()=>Ym,PackageCheck:()=>Jm,PackageMinus:()=>Qm,PackageOpen:()=>tx,PackagePlus:()=>ex,PackageSearch:()=>ax,PackageX:()=>rx,PaintBucket:()=>sx,PaintRoller:()=>ix,Paintbrush:()=>lx,Paintbrush2:()=>nx,Palette:()=>dx,Palmtree:()=>cx,PanelBottom:()=>hx,PanelBottomClose:()=>px,PanelBottomDashed:()=>we,PanelBottomOpen:()=>fx,PanelLeft:()=>ke,PanelLeftClose:()=>Ce,PanelLeftDashed:()=>Le,PanelLeftOpen:()=>Ee,PanelRight:()=>xx,PanelRightClose:()=>ux,PanelRightDashed:()=>Pe,PanelRightOpen:()=>mx,PanelTop:()=>yx,PanelTopClose:()=>gx,PanelTopDashed:()=>Te,PanelTopOpen:()=>vx,PanelsLeftBottom:()=>Mx,PanelsRightBottom:()=>bx,PanelsTopLeft:()=>De,Paperclip:()=>Sx,Parentheses:()=>Ax,ParkingCircle:()=>Cx,ParkingCircleOff:()=>wx,ParkingMeter:()=>Lx,ParkingSquare:()=>kx,ParkingSquareOff:()=>Ex,PartyPopper:()=>Px,Pause:()=>Hx,PauseCircle:()=>Tx,PauseOctagon:()=>Dx,PawPrint:()=>Fx,PcCase:()=>Vx,Pen:()=>Fe,PenLine:()=>He,PenTool:()=>Bx,Pencil:()=>$x,PencilLine:()=>Rx,PencilRuler:()=>Ix,Pentagon:()=>Ox,Percent:()=>Zx,PercentCircle:()=>Nx,PercentDiamond:()=>qx,PercentSquare:()=>Wx,PersonStanding:()=>Ux,Phone:()=>Yx,PhoneCall:()=>Gx,PhoneForwarded:()=>_x,PhoneIncoming:()=>zx,PhoneMissed:()=>jx,PhoneOff:()=>Xx,PhoneOutgoing:()=>Kx,Pi:()=>Qx,PiSquare:()=>Jx,Piano:()=>tg,Pickaxe:()=>eg,PictureInPicture:()=>rg,PictureInPicture2:()=>ag,PieChart:()=>og,PiggyBank:()=>sg,Pilcrow:()=>ng,PilcrowSquare:()=>ig,Pill:()=>lg,Pin:()=>cg,PinOff:()=>dg,Pipette:()=>pg,Pizza:()=>fg,Plane:()=>mg,PlaneLanding:()=>hg,PlaneTakeoff:()=>ug,Play:()=>vg,PlayCircle:()=>xg,PlaySquare:()=>gg,Plug:()=>Sg,Plug2:()=>yg,PlugZap:()=>bg,PlugZap2:()=>Mg,Plus:()=>Cg,PlusCircle:()=>Ag,PlusSquare:()=>wg,Pocket:()=>Eg,PocketKnife:()=>Lg,Podcast:()=>kg,Pointer:()=>Tg,PointerOff:()=>Pg,Popcorn:()=>Dg,Popsicle:()=>Hg,PoundSterling:()=>Fg,Power:()=>Ig,PowerCircle:()=>Vg,PowerOff:()=>Bg,PowerSquare:()=>Rg,Presentation:()=>$g,Printer:()=>Og,Projector:()=>Ng,Puzzle:()=>qg,Pyramid:()=>Wg,QrCode:()=>Zg,Quote:()=>Ug,Rabbit:()=>Gg,Radar:()=>_g,Radiation:()=>zg,Radical:()=>jg,Radio:()=>Yg,RadioReceiver:()=>Xg,RadioTower:()=>Kg,Radius:()=>Jg,RailSymbol:()=>Qg,Rainbow:()=>tv,Rat:()=>ev,Ratio:()=>av,Receipt:()=>pv,ReceiptCent:()=>rv,ReceiptEuro:()=>ov,ReceiptIndianRupee:()=>sv,ReceiptJapaneseYen:()=>iv,ReceiptPoundSterling:()=>nv,ReceiptRussianRuble:()=>lv,ReceiptSwissFranc:()=>dv,ReceiptText:()=>cv,RectangleHorizontal:()=>fv,RectangleVertical:()=>hv,Recycle:()=>uv,Redo:()=>gv,Redo2:()=>mv,RedoDot:()=>xv,RefreshCcw:()=>yv,RefreshCcwDot:()=>vv,RefreshCw:()=>bv,RefreshCwOff:()=>Mv,Refrigerator:()=>Sv,Regex:()=>Av,RemoveFormatting:()=>wv,Repeat:()=>Ev,Repeat1:()=>Cv,Repeat2:()=>Lv,Replace:()=>Pv,ReplaceAll:()=>kv,Reply:()=>Dv,ReplyAll:()=>Tv,Rewind:()=>Hv,Ribbon:()=>Fv,Rocket:()=>Vv,RockingChair:()=>Bv,RollerCoaster:()=>Rv,Rotate3d:()=>Ve,RotateCcw:()=>Iv,RotateCw:()=>$v,Route:()=>Nv,RouteOff:()=>Ov,Router:()=>qv,Rows2:()=>Be,Rows3:()=>Re,Rows4:()=>Wv,Rss:()=>Zv,Ruler:()=>Uv,RussianRuble:()=>Gv,Sailboat:()=>_v,Salad:()=>zv,Sandwich:()=>jv,Satellite:()=>Kv,SatelliteDish:()=>Xv,Save:()=>Jv,SaveAll:()=>Yv,Scale:()=>Qv,Scale3d:()=>Ie,Scaling:()=>t4,Scan:()=>n4,ScanBarcode:()=>e4,ScanEye:()=>a4,ScanFace:()=>r4,ScanLine:()=>o4,ScanSearch:()=>s4,ScanText:()=>i4,ScatterChart:()=>l4,School:()=>c4,School2:()=>d4,Scissors:()=>u4,ScissorsLineDashed:()=>p4,ScissorsSquare:()=>h4,ScissorsSquareDashedBottom:()=>f4,ScreenShare:()=>x4,ScreenShareOff:()=>m4,Scroll:()=>v4,ScrollText:()=>g4,Search:()=>A4,SearchCheck:()=>y4,SearchCode:()=>M4,SearchSlash:()=>b4,SearchX:()=>S4,Send:()=>C4,SendHorizontal:()=>$e,SendToBack:()=>w4,SeparatorHorizontal:()=>L4,SeparatorVertical:()=>E4,Server:()=>D4,ServerCog:()=>k4,ServerCrash:()=>P4,ServerOff:()=>T4,Settings:()=>F4,Settings2:()=>H4,Shapes:()=>V4,Share:()=>R4,Share2:()=>B4,Sheet:()=>I4,Shell:()=>$4,Shield:()=>j4,ShieldAlert:()=>O4,ShieldBan:()=>N4,ShieldCheck:()=>q4,ShieldEllipsis:()=>W4,ShieldHalf:()=>Z4,ShieldMinus:()=>U4,ShieldOff:()=>G4,ShieldPlus:()=>_4,ShieldQuestion:()=>z4,ShieldX:()=>Oe,Ship:()=>K4,ShipWheel:()=>X4,Shirt:()=>Y4,ShoppingBag:()=>J4,ShoppingBasket:()=>Q4,ShoppingCart:()=>t5,Shovel:()=>e5,ShowerHead:()=>a5,Shrink:()=>r5,Shrub:()=>o5,Shuffle:()=>s5,Sigma:()=>n5,SigmaSquare:()=>i5,Signal:()=>f5,SignalHigh:()=>l5,SignalLow:()=>d5,SignalMedium:()=>c5,SignalZero:()=>p5,Signpost:()=>u5,SignpostBig:()=>h5,Siren:()=>m5,SkipBack:()=>x5,SkipForward:()=>g5,Skull:()=>v5,Slack:()=>y5,Slash:()=>M5,SlashSquare:()=>Ne,Slice:()=>b5,Sliders:()=>A5,SlidersHorizontal:()=>S5,Smartphone:()=>L5,SmartphoneCharging:()=>w5,SmartphoneNfc:()=>C5,Smile:()=>k5,SmilePlus:()=>E5,Snail:()=>P5,Snowflake:()=>T5,Sofa:()=>D5,Soup:()=>H5,Space:()=>F5,Spade:()=>V5,Sparkle:()=>B5,Sparkles:()=>qe,Speaker:()=>R5,Speech:()=>I5,SpellCheck:()=>O5,SpellCheck2:()=>$5,Spline:()=>N5,Split:()=>Z5,SplitSquareHorizontal:()=>q5,SplitSquareVertical:()=>W5,SprayCan:()=>U5,Sprout:()=>G5,Square:()=>K5,SquareDashedBottom:()=>z5,SquareDashedBottomCode:()=>_5,SquarePen:()=>Lt,SquareRadical:()=>j5,SquareStack:()=>X5,SquareUser:()=>Ze,SquareUserRound:()=>We,Squircle:()=>Y5,Squirrel:()=>J5,Stamp:()=>Q5,Star:()=>a3,StarHalf:()=>t3,StarOff:()=>e3,StepBack:()=>r3,StepForward:()=>o3,Stethoscope:()=>s3,Sticker:()=>i3,StickyNote:()=>n3,StopCircle:()=>l3,Store:()=>d3,StretchHorizontal:()=>c3,StretchVertical:()=>p3,Strikethrough:()=>f3,Subscript:()=>h3,Sun:()=>v3,SunDim:()=>u3,SunMedium:()=>m3,SunMoon:()=>x3,SunSnow:()=>g3,Sunrise:()=>y3,Sunset:()=>M3,Superscript:()=>b3,SwatchBook:()=>S3,SwissFranc:()=>A3,SwitchCamera:()=>w3,Sword:()=>C3,Swords:()=>L3,Syringe:()=>E3,Table:()=>V3,Table2:()=>k3,TableCellsMerge:()=>P3,TableCellsSplit:()=>T3,TableColumnsSplit:()=>D3,TableProperties:()=>H3,TableRowsSplit:()=>F3,Tablet:()=>R3,TabletSmartphone:()=>B3,Tablets:()=>I3,Tag:()=>$3,Tags:()=>O3,Tally1:()=>N3,Tally2:()=>q3,Tally3:()=>W3,Tally4:()=>Z3,Tally5:()=>U3,Tangent:()=>G3,Target:()=>_3,Telescope:()=>z3,Tent:()=>X3,TentTree:()=>j3,Terminal:()=>Y3,TerminalSquare:()=>K3,TestTube:()=>Q3,TestTube2:()=>J3,TestTubes:()=>ty,Text:()=>sy,TextCursor:()=>ay,TextCursorInput:()=>ey,TextQuote:()=>ry,TextSearch:()=>oy,TextSelect:()=>Ue,Theater:()=>iy,Thermometer:()=>dy,ThermometerSnowflake:()=>ny,ThermometerSun:()=>ly,ThumbsDown:()=>cy,ThumbsUp:()=>py,Ticket:()=>vy,TicketCheck:()=>fy,TicketMinus:()=>hy,TicketPercent:()=>uy,TicketPlus:()=>my,TicketSlash:()=>xy,TicketX:()=>gy,Timer:()=>by,TimerOff:()=>yy,TimerReset:()=>My,ToggleLeft:()=>Sy,ToggleRight:()=>Ay,Tornado:()=>wy,Torus:()=>Cy,Touchpad:()=>Ey,TouchpadOff:()=>Ly,TowerControl:()=>ky,ToyBrick:()=>Py,Tractor:()=>Ty,TrafficCone:()=>Dy,TrainFront:()=>Fy,TrainFrontTunnel:()=>Hy,TrainTrack:()=>Vy,TramFront:()=>Ge,Trash:()=>Ry,Trash2:()=>By,TreeDeciduous:()=>Iy,TreePine:()=>$y,Trees:()=>Oy,Trello:()=>Ny,TrendingDown:()=>qy,TrendingUp:()=>Wy,Triangle:()=>Uy,TriangleRight:()=>Zy,Trophy:()=>Gy,Truck:()=>_y,Turtle:()=>zy,Tv:()=>Xy,Tv2:()=>jy,Twitch:()=>Ky,Twitter:()=>Yy,Type:()=>Jy,Umbrella:()=>tM,UmbrellaOff:()=>Qy,Underline:()=>eM,Undo:()=>oM,Undo2:()=>aM,UndoDot:()=>rM,UnfoldHorizontal:()=>sM,UnfoldVertical:()=>iM,Ungroup:()=>nM,Unlink:()=>dM,Unlink2:()=>lM,Unlock:()=>pM,UnlockKeyhole:()=>cM,Unplug:()=>fM,Upload:()=>uM,UploadCloud:()=>hM,Usb:()=>mM,User:()=>AM,UserCheck:()=>xM,UserCog:()=>gM,UserMinus:()=>vM,UserPlus:()=>yM,UserRound:()=>Ye,UserRoundCheck:()=>_e,UserRoundCog:()=>ze,UserRoundMinus:()=>je,UserRoundPlus:()=>Xe,UserRoundSearch:()=>MM,UserRoundX:()=>Ke,UserSearch:()=>bM,UserX:()=>SM,Users:()=>wM,UsersRound:()=>Je,Utensils:()=>LM,UtensilsCrossed:()=>CM,UtilityPole:()=>EM,Variable:()=>kM,Vault:()=>PM,Vegan:()=>TM,VenetianMask:()=>DM,Vibrate:()=>FM,VibrateOff:()=>HM,Video:()=>BM,VideoOff:()=>VM,Videotape:()=>RM,View:()=>IM,Voicemail:()=>$M,Volume:()=>WM,Volume1:()=>OM,Volume2:()=>NM,VolumeX:()=>qM,Vote:()=>ZM,Wallet:()=>_M,Wallet2:()=>UM,WalletCards:()=>GM,Wallpaper:()=>zM,Wand:()=>XM,Wand2:()=>jM,Warehouse:()=>KM,WashingMachine:()=>YM,Watch:()=>JM,Waves:()=>QM,Waypoints:()=>t6,Webcam:()=>e6,Webhook:()=>r6,WebhookOff:()=>a6,Weight:()=>o6,Wheat:()=>i6,WheatOff:()=>s6,WholeWord:()=>n6,Wifi:()=>d6,WifiOff:()=>l6,Wind:()=>c6,Wine:()=>f6,WineOff:()=>p6,Workflow:()=>h6,WrapText:()=>u6,Wrench:()=>m6,X:()=>y6,XCircle:()=>x6,XOctagon:()=>g6,XSquare:()=>v6,Youtube:()=>M6,Zap:()=>S6,ZapOff:()=>b6,ZoomIn:()=>A6,ZoomOut:()=>w6,createElement:()=>fa,createIcons:()=>C6,icons:()=>Qe});var m8=(E,o,e=[])=>{let a=document.createElementNS("http://www.w3.org/2000/svg",E);return Object.keys(o).forEach(r=>{a.setAttribute(r,String(o[r]))}),e.length&&e.forEach(r=>{let s=m8(...r);a.appendChild(s)}),a},fa=([E,o,e])=>m8(E,o,e);var R8=E=>Array.from(E.attributes).reduce((o,e)=>(o[e.name]=e.value,o),{}),I8=E=>typeof E=="string"?E:!E||!E.class?"":E.class&&typeof E.class=="string"?E.class.split(" "):E.class&&Array.isArray(E.class)?E.class:"",$8=E=>E.flatMap(I8).map(e=>e.trim()).filter(Boolean).filter((e,a,r)=>r.indexOf(e)===a).join(" "),O8=E=>E.replace(/(\w)(\w*)(_|-|\s*)/g,(o,e,a)=>e.toUpperCase()+a.toLowerCase()),r8=(E,{nameAttr:o,icons:e,attrs:a})=>{var u;let r=E.getAttribute(o);if(r==null)return;let s=O8(r),n=e[s];if(!n)return console.warn(`${E.outerHTML} icon name was not found in the provided icons object.`);let i=R8(E),[l,d,c]=n,p={...d,"data-lucide":r,...a,...i},f=$8(["lucide",`lucide-${r}`,i,a]);f&&Object.assign(p,{class:f});let g=fa([l,p,c]);return(u=E.parentNode)==null?void 0:u.replaceChild(g,E)};var Qe={};K6(Qe,{AArrowDown:()=>ha,AArrowUp:()=>ua,ALargeSmall:()=>ma,Accessibility:()=>xa,Activity:()=>va,ActivitySquare:()=>ga,AirVent:()=>ya,Airplay:()=>Ma,AlarmCheck:()=>$t,AlarmClock:()=>Sa,AlarmClockCheck:()=>$t,AlarmClockMinus:()=>Ot,AlarmClockOff:()=>ba,AlarmClockPlus:()=>Nt,AlarmMinus:()=>Ot,AlarmPlus:()=>Nt,AlarmSmoke:()=>Aa,Album:()=>wa,AlertCircle:()=>Ca,AlertOctagon:()=>La,AlertTriangle:()=>Ea,AlignCenter:()=>Ta,AlignCenterHorizontal:()=>ka,AlignCenterVertical:()=>Pa,AlignEndHorizontal:()=>Da,AlignEndVertical:()=>Ha,AlignHorizontalDistributeCenter:()=>Fa,AlignHorizontalDistributeEnd:()=>Va,AlignHorizontalDistributeStart:()=>Ba,AlignHorizontalJustifyCenter:()=>Ra,AlignHorizontalJustifyEnd:()=>Ia,AlignHorizontalJustifyStart:()=>$a,AlignHorizontalSpaceAround:()=>Oa,AlignHorizontalSpaceBetween:()=>Na,AlignJustify:()=>qa,AlignLeft:()=>Wa,AlignRight:()=>Za,AlignStartHorizontal:()=>Ua,AlignStartVertical:()=>Ga,AlignVerticalDistributeCenter:()=>_a,AlignVerticalDistributeEnd:()=>za,AlignVerticalDistributeStart:()=>ja,AlignVerticalJustifyCenter:()=>Xa,AlignVerticalJustifyEnd:()=>Ka,AlignVerticalJustifyStart:()=>Ya,AlignVerticalSpaceAround:()=>Ja,AlignVerticalSpaceBetween:()=>Qa,Ambulance:()=>tr,Ampersand:()=>er,Ampersands:()=>ar,Anchor:()=>rr,Angry:()=>or,Annoyed:()=>sr,Antenna:()=>ir,Anvil:()=>nr,Aperture:()=>lr,AppWindow:()=>dr,Apple:()=>cr,Archive:()=>hr,ArchiveRestore:()=>pr,ArchiveX:()=>fr,AreaChart:()=>ur,Armchair:()=>mr,ArrowBigDown:()=>gr,ArrowBigDownDash:()=>xr,ArrowBigLeft:()=>yr,ArrowBigLeftDash:()=>vr,ArrowBigRight:()=>br,ArrowBigRightDash:()=>Mr,ArrowBigUp:()=>Ar,ArrowBigUpDash:()=>Sr,ArrowDown:()=>qr,ArrowDown01:()=>wr,ArrowDown10:()=>Cr,ArrowDownAZ:()=>qt,ArrowDownAz:()=>qt,ArrowDownCircle:()=>Lr,ArrowDownFromLine:()=>Er,ArrowDownLeft:()=>Dr,ArrowDownLeftFromCircle:()=>kr,ArrowDownLeftFromSquare:()=>Pr,ArrowDownLeftSquare:()=>Tr,ArrowDownNarrowWide:()=>Hr,ArrowDownRight:()=>Rr,ArrowDownRightFromCircle:()=>Fr,ArrowDownRightFromSquare:()=>Vr,ArrowDownRightSquare:()=>Br,ArrowDownSquare:()=>Ir,ArrowDownToDot:()=>$r,ArrowDownToLine:()=>Or,ArrowDownUp:()=>Nr,ArrowDownWideNarrow:()=>Wt,ArrowDownZA:()=>Zt,ArrowDownZa:()=>Zt,ArrowLeft:()=>zr,ArrowLeftCircle:()=>Wr,ArrowLeftFromLine:()=>Zr,ArrowLeftRight:()=>Ur,ArrowLeftSquare:()=>Gr,ArrowLeftToLine:()=>_r,ArrowRight:()=>Qr,ArrowRightCircle:()=>jr,ArrowRightFromLine:()=>Xr,ArrowRightLeft:()=>Kr,ArrowRightSquare:()=>Yr,ArrowRightToLine:()=>Jr,ArrowUp:()=>vo,ArrowUp01:()=>to,ArrowUp10:()=>eo,ArrowUpAZ:()=>Ut,ArrowUpAz:()=>Ut,ArrowUpCircle:()=>ao,ArrowUpDown:()=>ro,ArrowUpFromDot:()=>oo,ArrowUpFromLine:()=>so,ArrowUpLeft:()=>co,ArrowUpLeftFromCircle:()=>io,ArrowUpLeftFromSquare:()=>no,ArrowUpLeftSquare:()=>lo,ArrowUpNarrowWide:()=>Gt,ArrowUpRight:()=>uo,ArrowUpRightFromCircle:()=>po,ArrowUpRightFromSquare:()=>fo,ArrowUpRightSquare:()=>ho,ArrowUpSquare:()=>mo,ArrowUpToLine:()=>xo,ArrowUpWideNarrow:()=>go,ArrowUpZA:()=>_t,ArrowUpZa:()=>_t,ArrowsUpFromLine:()=>yo,Asterisk:()=>Mo,AsteriskSquare:()=>zt,AtSign:()=>bo,Atom:()=>So,AudioLines:()=>Ao,AudioWaveform:()=>wo,Award:()=>Co,Axe:()=>Lo,Axis3D:()=>jt,Axis3d:()=>jt,Baby:()=>Eo,Backpack:()=>ko,Badge:()=>Uo,BadgeAlert:()=>Po,BadgeCent:()=>To,BadgeCheck:()=>Xt,BadgeDollarSign:()=>Do,BadgeEuro:()=>Ho,BadgeHelp:()=>Fo,BadgeIndianRupee:()=>Vo,BadgeInfo:()=>Bo,BadgeJapaneseYen:()=>Ro,BadgeMinus:()=>Io,BadgePercent:()=>$o,BadgePlus:()=>Oo,BadgePoundSterling:()=>No,BadgeRussianRuble:()=>qo,BadgeSwissFranc:()=>Wo,BadgeX:()=>Zo,BaggageClaim:()=>Go,Ban:()=>_o,Banana:()=>zo,Banknote:()=>jo,BarChart:()=>es,BarChart2:()=>Xo,BarChart3:()=>Ko,BarChart4:()=>Yo,BarChartBig:()=>Jo,BarChartHorizontal:()=>ts,BarChartHorizontalBig:()=>Qo,Barcode:()=>as,Baseline:()=>rs,Bath:()=>os,Battery:()=>cs,BatteryCharging:()=>ss,BatteryFull:()=>is,BatteryLow:()=>ns,BatteryMedium:()=>ls,BatteryWarning:()=>ds,Beaker:()=>ps,Bean:()=>hs,BeanOff:()=>fs,Bed:()=>xs,BedDouble:()=>us,BedSingle:()=>ms,Beef:()=>gs,Beer:()=>vs,Bell:()=>Cs,BellDot:()=>ys,BellElectric:()=>Ms,BellMinus:()=>bs,BellOff:()=>Ss,BellPlus:()=>As,BellRing:()=>ws,BetweenHorizonalEnd:()=>Kt,BetweenHorizonalStart:()=>Yt,BetweenHorizontalEnd:()=>Kt,BetweenHorizontalStart:()=>Yt,BetweenVerticalEnd:()=>Ls,BetweenVerticalStart:()=>Es,Bike:()=>ks,Binary:()=>Ps,Biohazard:()=>Ts,Bird:()=>Ds,Bitcoin:()=>Hs,Blend:()=>Fs,Blinds:()=>Vs,Blocks:()=>Bs,Bluetooth:()=>Os,BluetoothConnected:()=>Rs,BluetoothOff:()=>Is,BluetoothSearching:()=>$s,Bold:()=>Ns,Bolt:()=>qs,Bomb:()=>Ws,Bone:()=>Zs,Book:()=>fi,BookA:()=>Us,BookAudio:()=>Gs,BookCheck:()=>_s,BookCopy:()=>zs,BookDashed:()=>Jt,BookDown:()=>js,BookHeadphones:()=>Xs,BookHeart:()=>Ks,BookImage:()=>Ys,BookKey:()=>Js,BookLock:()=>Qs,BookMarked:()=>ti,BookMinus:()=>ei,BookOpen:()=>oi,BookOpenCheck:()=>ai,BookOpenText:()=>ri,BookPlus:()=>si,BookTemplate:()=>Jt,BookText:()=>ii,BookType:()=>ni,BookUp:()=>di,BookUp2:()=>li,BookUser:()=>ci,BookX:()=>pi,Bookmark:()=>gi,BookmarkCheck:()=>hi,BookmarkMinus:()=>ui,BookmarkPlus:()=>mi,BookmarkX:()=>xi,BoomBox:()=>vi,Bot:()=>yi,Box:()=>bi,BoxSelect:()=>Mi,Boxes:()=>Si,Braces:()=>Qt,Brackets:()=>Ai,Brain:()=>Li,BrainCircuit:()=>wi,BrainCog:()=>Ci,BrickWall:()=>Ei,Briefcase:()=>ki,BringToFront:()=>Pi,Brush:()=>Ti,Bug:()=>Fi,BugOff:()=>Di,BugPlay:()=>Hi,Building:()=>Bi,Building2:()=>Vi,Bus:()=>Ii,BusFront:()=>Ri,Cable:()=>Oi,CableCar:()=>$i,Cake:()=>qi,CakeSlice:()=>Ni,Calculator:()=>Wi,Calendar:()=>on,CalendarCheck:()=>Ui,CalendarCheck2:()=>Zi,CalendarClock:()=>Gi,CalendarDays:()=>_i,CalendarFold:()=>zi,CalendarHeart:()=>ji,CalendarMinus:()=>Ki,CalendarMinus2:()=>Xi,CalendarOff:()=>Yi,CalendarPlus:()=>Qi,CalendarPlus2:()=>Ji,CalendarRange:()=>tn,CalendarSearch:()=>en,CalendarX:()=>rn,CalendarX2:()=>an,Camera:()=>nn,CameraOff:()=>sn,CandlestickChart:()=>ln,Candy:()=>pn,CandyCane:()=>dn,CandyOff:()=>cn,Captions:()=>te,CaptionsOff:()=>fn,Car:()=>mn,CarFront:()=>hn,CarTaxiFront:()=>un,Caravan:()=>xn,Carrot:()=>gn,CaseLower:()=>vn,CaseSensitive:()=>yn,CaseUpper:()=>Mn,CassetteTape:()=>bn,Cast:()=>Sn,Castle:()=>An,Cat:()=>wn,Cctv:()=>Cn,Check:()=>Dn,CheckCheck:()=>Ln,CheckCircle:()=>kn,CheckCircle2:()=>En,CheckSquare:()=>Tn,CheckSquare2:()=>Pn,ChefHat:()=>Hn,Cherry:()=>Fn,ChevronDown:()=>Rn,ChevronDownCircle:()=>Vn,ChevronDownSquare:()=>Bn,ChevronFirst:()=>In,ChevronLast:()=>$n,ChevronLeft:()=>qn,ChevronLeftCircle:()=>On,ChevronLeftSquare:()=>Nn,ChevronRight:()=>Un,ChevronRightCircle:()=>Wn,ChevronRightSquare:()=>Zn,ChevronUp:()=>zn,ChevronUpCircle:()=>Gn,ChevronUpSquare:()=>_n,ChevronsDown:()=>Xn,ChevronsDownUp:()=>jn,ChevronsLeft:()=>Yn,ChevronsLeftRight:()=>Kn,ChevronsRight:()=>Qn,ChevronsRightLeft:()=>Jn,ChevronsUp:()=>el,ChevronsUpDown:()=>tl,Chrome:()=>al,Church:()=>rl,Cigarette:()=>sl,CigaretteOff:()=>ol,Circle:()=>ml,CircleDashed:()=>il,CircleDollarSign:()=>nl,CircleDot:()=>dl,CircleDotDashed:()=>ll,CircleEllipsis:()=>cl,CircleEqual:()=>pl,CircleFadingPlus:()=>fl,CircleOff:()=>hl,CircleSlash:()=>ul,CircleSlash2:()=>ee,CircleSlashed:()=>ee,CircleUser:()=>re,CircleUserRound:()=>ae,CircuitBoard:()=>xl,Citrus:()=>gl,Clapperboard:()=>vl,Clipboard:()=>El,ClipboardCheck:()=>yl,ClipboardCopy:()=>Ml,ClipboardEdit:()=>se,ClipboardList:()=>bl,ClipboardMinus:()=>Sl,ClipboardPaste:()=>Al,ClipboardPen:()=>se,ClipboardPenLine:()=>oe,ClipboardPlus:()=>wl,ClipboardSignature:()=>oe,ClipboardType:()=>Cl,ClipboardX:()=>Ll,Clock:()=>Nl,Clock1:()=>kl,Clock10:()=>Pl,Clock11:()=>Tl,Clock12:()=>Dl,Clock2:()=>Hl,Clock3:()=>Fl,Clock4:()=>Vl,Clock5:()=>Bl,Clock6:()=>Rl,Clock7:()=>Il,Clock8:()=>$l,Clock9:()=>Ol,Cloud:()=>td,CloudCog:()=>ql,CloudDrizzle:()=>Wl,CloudFog:()=>Zl,CloudHail:()=>Ul,CloudLightning:()=>Gl,CloudMoon:()=>zl,CloudMoonRain:()=>_l,CloudOff:()=>jl,CloudRain:()=>Kl,CloudRainWind:()=>Xl,CloudSnow:()=>Yl,CloudSun:()=>Ql,CloudSunRain:()=>Jl,Cloudy:()=>ed,Clover:()=>ad,Club:()=>rd,Code:()=>sd,Code2:()=>od,CodeSquare:()=>ie,Codepen:()=>id,Codesandbox:()=>nd,Coffee:()=>ld,Cog:()=>dd,Coins:()=>cd,Columns:()=>ne,Columns2:()=>ne,Columns3:()=>le,Columns4:()=>pd,Combine:()=>fd,Command:()=>hd,Compass:()=>ud,Component:()=>md,Computer:()=>xd,ConciergeBell:()=>gd,Cone:()=>vd,Construction:()=>yd,Contact:()=>bd,Contact2:()=>Md,Container:()=>Sd,Contrast:()=>Ad,Cookie:()=>wd,CookingPot:()=>Cd,Copy:()=>Dd,CopyCheck:()=>Ld,CopyMinus:()=>Ed,CopyPlus:()=>kd,CopySlash:()=>Pd,CopyX:()=>Td,Copyleft:()=>Hd,Copyright:()=>Fd,CornerDownLeft:()=>Vd,CornerDownRight:()=>Bd,CornerLeftDown:()=>Rd,CornerLeftUp:()=>Id,CornerRightDown:()=>$d,CornerRightUp:()=>Od,CornerUpLeft:()=>Nd,CornerUpRight:()=>qd,Cpu:()=>Wd,CreativeCommons:()=>Zd,CreditCard:()=>Ud,Croissant:()=>Gd,Crop:()=>_d,Cross:()=>zd,Crosshair:()=>jd,Crown:()=>Xd,Cuboid:()=>Kd,CupSoda:()=>Yd,CurlyBraces:()=>Qt,Currency:()=>Jd,Cylinder:()=>Qd,Database:()=>ac,DatabaseBackup:()=>tc,DatabaseZap:()=>ec,Delete:()=>rc,Dessert:()=>oc,Diameter:()=>sc,Diamond:()=>ic,Dice1:()=>nc,Dice2:()=>lc,Dice3:()=>dc,Dice4:()=>cc,Dice5:()=>pc,Dice6:()=>fc,Dices:()=>hc,Diff:()=>uc,Disc:()=>vc,Disc2:()=>mc,Disc3:()=>xc,DiscAlbum:()=>gc,Divide:()=>bc,DivideCircle:()=>yc,DivideSquare:()=>Mc,Dna:()=>Ac,DnaOff:()=>Sc,Dog:()=>wc,DollarSign:()=>Cc,Donut:()=>Lc,DoorClosed:()=>Ec,DoorOpen:()=>kc,Dot:()=>Pc,DotSquare:()=>de,Download:()=>Dc,DownloadCloud:()=>Tc,DraftingCompass:()=>Hc,Drama:()=>Fc,Dribbble:()=>Vc,Drill:()=>Bc,Droplet:()=>Rc,Droplets:()=>Ic,Drum:()=>$c,Drumstick:()=>Oc,Dumbbell:()=>Nc,Ear:()=>Wc,EarOff:()=>qc,Eclipse:()=>Zc,Edit:()=>Lt,Edit2:()=>Fe,Edit3:()=>He,Egg:()=>_c,EggFried:()=>Uc,EggOff:()=>Gc,Equal:()=>jc,EqualNot:()=>zc,EqualSquare:()=>ce,Eraser:()=>Xc,Euro:()=>Kc,Expand:()=>Yc,ExternalLink:()=>Jc,Eye:()=>t1,EyeOff:()=>Qc,Facebook:()=>e1,Factory:()=>a1,Fan:()=>r1,FastForward:()=>o1,Feather:()=>s1,Fence:()=>i1,FerrisWheel:()=>n1,Figma:()=>l1,File:()=>lp,FileArchive:()=>d1,FileAudio:()=>p1,FileAudio2:()=>c1,FileAxis3D:()=>pe,FileAxis3d:()=>pe,FileBadge:()=>h1,FileBadge2:()=>f1,FileBarChart:()=>m1,FileBarChart2:()=>u1,FileBox:()=>x1,FileCheck:()=>v1,FileCheck2:()=>g1,FileClock:()=>y1,FileCode:()=>b1,FileCode2:()=>M1,FileCog:()=>fe,FileCog2:()=>fe,FileDiff:()=>S1,FileDigit:()=>A1,FileDown:()=>w1,FileEdit:()=>ue,FileHeart:()=>C1,FileImage:()=>L1,FileInput:()=>E1,FileJson:()=>P1,FileJson2:()=>k1,FileKey:()=>D1,FileKey2:()=>T1,FileLineChart:()=>H1,FileLock:()=>V1,FileLock2:()=>F1,FileMinus:()=>R1,FileMinus2:()=>B1,FileMusic:()=>I1,FileOutput:()=>$1,FilePen:()=>ue,FilePenLine:()=>he,FilePieChart:()=>O1,FilePlus:()=>q1,FilePlus2:()=>N1,FileQuestion:()=>W1,FileScan:()=>Z1,FileSearch:()=>G1,FileSearch2:()=>U1,FileSignature:()=>he,FileSliders:()=>_1,FileSpreadsheet:()=>z1,FileStack:()=>j1,FileSymlink:()=>X1,FileTerminal:()=>K1,FileText:()=>Y1,FileType:()=>Q1,FileType2:()=>J1,FileUp:()=>tp,FileVideo:()=>ap,FileVideo2:()=>ep,FileVolume:()=>op,FileVolume2:()=>rp,FileWarning:()=>sp,FileX:()=>np,FileX2:()=>ip,Files:()=>dp,Film:()=>cp,Filter:()=>fp,FilterX:()=>pp,Fingerprint:()=>hp,FireExtinguisher:()=>up,Fish:()=>gp,FishOff:()=>mp,FishSymbol:()=>xp,Flag:()=>bp,FlagOff:()=>vp,FlagTriangleLeft:()=>yp,FlagTriangleRight:()=>Mp,Flame:()=>Ap,FlameKindling:()=>Sp,Flashlight:()=>Cp,FlashlightOff:()=>wp,FlaskConical:()=>Ep,FlaskConicalOff:()=>Lp,FlaskRound:()=>kp,FlipHorizontal:()=>Tp,FlipHorizontal2:()=>Pp,FlipVertical:()=>Hp,FlipVertical2:()=>Dp,Flower:()=>Vp,Flower2:()=>Fp,Focus:()=>Bp,FoldHorizontal:()=>Rp,FoldVertical:()=>Ip,Folder:()=>c2,FolderArchive:()=>$p,FolderCheck:()=>Op,FolderClock:()=>Np,FolderClosed:()=>qp,FolderCog:()=>me,FolderCog2:()=>me,FolderDot:()=>Wp,FolderDown:()=>Zp,FolderEdit:()=>xe,FolderGit:()=>Gp,FolderGit2:()=>Up,FolderHeart:()=>_p,FolderInput:()=>zp,FolderKanban:()=>jp,FolderKey:()=>Xp,FolderLock:()=>Kp,FolderMinus:()=>Yp,FolderOpen:()=>Qp,FolderOpenDot:()=>Jp,FolderOutput:()=>t2,FolderPen:()=>xe,FolderPlus:()=>e2,FolderRoot:()=>a2,FolderSearch:()=>o2,FolderSearch2:()=>r2,FolderSymlink:()=>s2,FolderSync:()=>i2,FolderTree:()=>n2,FolderUp:()=>l2,FolderX:()=>d2,Folders:()=>p2,Footprints:()=>f2,Forklift:()=>h2,FormInput:()=>u2,Forward:()=>m2,Frame:()=>x2,Framer:()=>g2,Frown:()=>v2,Fuel:()=>y2,Fullscreen:()=>M2,FunctionSquare:()=>b2,GalleryHorizontal:()=>A2,GalleryHorizontalEnd:()=>S2,GalleryThumbnails:()=>w2,GalleryVertical:()=>L2,GalleryVerticalEnd:()=>C2,Gamepad:()=>k2,Gamepad2:()=>E2,GanttChart:()=>P2,GanttChartSquare:()=>Pt,GanttSquare:()=>Pt,Gauge:()=>D2,GaugeCircle:()=>T2,Gavel:()=>H2,Gem:()=>F2,Ghost:()=>V2,Gift:()=>B2,GitBranch:()=>I2,GitBranchPlus:()=>R2,GitCommit:()=>ge,GitCommitHorizontal:()=>ge,GitCommitVertical:()=>$2,GitCompare:()=>N2,GitCompareArrows:()=>O2,GitFork:()=>q2,GitGraph:()=>W2,GitMerge:()=>Z2,GitPullRequest:()=>X2,GitPullRequestArrow:()=>U2,GitPullRequestClosed:()=>G2,GitPullRequestCreate:()=>z2,GitPullRequestCreateArrow:()=>_2,GitPullRequestDraft:()=>j2,Github:()=>K2,Gitlab:()=>Y2,GlassWater:()=>J2,Glasses:()=>Q2,Globe:()=>ef,Globe2:()=>tf,Goal:()=>af,Grab:()=>rf,GraduationCap:()=>of,Grape:()=>sf,Grid:()=>Tt,Grid2X2:()=>ve,Grid2x2:()=>ve,Grid3X3:()=>Tt,Grid3x3:()=>Tt,Grip:()=>df,GripHorizontal:()=>nf,GripVertical:()=>lf,Group:()=>cf,Guitar:()=>pf,Hammer:()=>ff,Hand:()=>gf,HandCoins:()=>hf,HandHeart:()=>uf,HandHelping:()=>ye,HandMetal:()=>mf,HandPlatter:()=>xf,Handshake:()=>vf,HardDrive:()=>bf,HardDriveDownload:()=>yf,HardDriveUpload:()=>Mf,HardHat:()=>Sf,Hash:()=>Af,Haze:()=>wf,HdmiPort:()=>Cf,Heading:()=>Hf,Heading1:()=>Lf,Heading2:()=>Ef,Heading3:()=>kf,Heading4:()=>Pf,Heading5:()=>Tf,Heading6:()=>Df,Headphones:()=>Ff,Headset:()=>Vf,Heart:()=>Of,HeartCrack:()=>Bf,HeartHandshake:()=>Rf,HeartOff:()=>If,HeartPulse:()=>$f,Heater:()=>Nf,HelpCircle:()=>qf,HelpingHand:()=>ye,Hexagon:()=>Wf,Highlighter:()=>Zf,History:()=>Uf,Home:()=>Gf,Hop:()=>zf,HopOff:()=>_f,Hotel:()=>jf,Hourglass:()=>Xf,IceCream:()=>Yf,IceCream2:()=>Kf,Image:()=>ah,ImageDown:()=>Jf,ImageMinus:()=>Qf,ImageOff:()=>th,ImagePlus:()=>eh,Images:()=>rh,Import:()=>oh,Inbox:()=>sh,Indent:()=>ih,IndianRupee:()=>nh,Infinity:()=>lh,Info:()=>dh,Inspect:()=>Se,InspectionPanel:()=>ch,Instagram:()=>ph,Italic:()=>fh,IterationCcw:()=>hh,IterationCw:()=>uh,JapaneseYen:()=>mh,Joystick:()=>xh,Kanban:()=>gh,KanbanSquare:()=>be,KanbanSquareDashed:()=>Me,Key:()=>Mh,KeyRound:()=>vh,KeySquare:()=>yh,Keyboard:()=>Sh,KeyboardMusic:()=>bh,Lamp:()=>kh,LampCeiling:()=>Ah,LampDesk:()=>wh,LampFloor:()=>Ch,LampWallDown:()=>Lh,LampWallUp:()=>Eh,LandPlot:()=>Ph,Landmark:()=>Th,Languages:()=>Dh,Laptop:()=>Fh,Laptop2:()=>Hh,Lasso:()=>Bh,LassoSelect:()=>Vh,Laugh:()=>Rh,Layers:()=>Oh,Layers2:()=>Ih,Layers3:()=>$h,Layout:()=>De,LayoutDashboard:()=>Nh,LayoutGrid:()=>qh,LayoutList:()=>Wh,LayoutPanelLeft:()=>Zh,LayoutPanelTop:()=>Uh,LayoutTemplate:()=>Gh,Leaf:()=>_h,LeafyGreen:()=>zh,Library:()=>Kh,LibraryBig:()=>jh,LibrarySquare:()=>Xh,LifeBuoy:()=>Yh,Ligature:()=>Jh,Lightbulb:()=>tu,LightbulbOff:()=>Qh,LineChart:()=>eu,Link:()=>ou,Link2:()=>ru,Link2Off:()=>au,Linkedin:()=>su,List:()=>Mu,ListChecks:()=>iu,ListCollapse:()=>nu,ListEnd:()=>lu,ListFilter:()=>du,ListMinus:()=>cu,ListMusic:()=>pu,ListOrdered:()=>fu,ListPlus:()=>hu,ListRestart:()=>uu,ListStart:()=>mu,ListTodo:()=>xu,ListTree:()=>gu,ListVideo:()=>vu,ListX:()=>yu,Loader:()=>Su,Loader2:()=>bu,Locate:()=>Cu,LocateFixed:()=>Au,LocateOff:()=>wu,Lock:()=>Eu,LockKeyhole:()=>Lu,LogIn:()=>ku,LogOut:()=>Pu,Lollipop:()=>Tu,Luggage:()=>Du,MSquare:()=>Hu,Magnet:()=>Fu,Mail:()=>Wu,MailCheck:()=>Vu,MailMinus:()=>Bu,MailOpen:()=>Ru,MailPlus:()=>Iu,MailQuestion:()=>$u,MailSearch:()=>Ou,MailWarning:()=>Nu,MailX:()=>qu,Mailbox:()=>Zu,Mails:()=>Uu,Map:()=>ju,MapPin:()=>_u,MapPinOff:()=>Gu,MapPinned:()=>zu,Martini:()=>Xu,Maximize:()=>Yu,Maximize2:()=>Ku,Medal:()=>Ju,Megaphone:()=>t0,MegaphoneOff:()=>Qu,Meh:()=>e0,MemoryStick:()=>a0,Menu:()=>o0,MenuSquare:()=>r0,Merge:()=>s0,MessageCircle:()=>x0,MessageCircleCode:()=>i0,MessageCircleDashed:()=>n0,MessageCircleHeart:()=>l0,MessageCircleMore:()=>d0,MessageCircleOff:()=>c0,MessageCirclePlus:()=>p0,MessageCircleQuestion:()=>f0,MessageCircleReply:()=>h0,MessageCircleWarning:()=>u0,MessageCircleX:()=>m0,MessageSquare:()=>D0,MessageSquareCode:()=>g0,MessageSquareDashed:()=>v0,MessageSquareDiff:()=>y0,MessageSquareDot:()=>M0,MessageSquareHeart:()=>b0,MessageSquareMore:()=>S0,MessageSquareOff:()=>A0,MessageSquarePlus:()=>w0,MessageSquareQuote:()=>C0,MessageSquareReply:()=>L0,MessageSquareShare:()=>E0,MessageSquareText:()=>k0,MessageSquareWarning:()=>P0,MessageSquareX:()=>T0,MessagesSquare:()=>H0,Mic:()=>B0,Mic2:()=>F0,MicOff:()=>V0,Microscope:()=>R0,Microwave:()=>I0,Milestone:()=>$0,Milk:()=>N0,MilkOff:()=>O0,Minimize:()=>W0,Minimize2:()=>q0,Minus:()=>G0,MinusCircle:()=>Z0,MinusSquare:()=>U0,Monitor:()=>rm,MonitorCheck:()=>_0,MonitorDot:()=>z0,MonitorDown:()=>j0,MonitorOff:()=>X0,MonitorPause:()=>K0,MonitorPlay:()=>Y0,MonitorSmartphone:()=>J0,MonitorSpeaker:()=>Q0,MonitorStop:()=>tm,MonitorUp:()=>em,MonitorX:()=>am,Moon:()=>sm,MoonStar:()=>om,MoreHorizontal:()=>im,MoreVertical:()=>nm,Mountain:()=>dm,MountainSnow:()=>lm,Mouse:()=>um,MousePointer:()=>hm,MousePointer2:()=>cm,MousePointerClick:()=>pm,MousePointerSquare:()=>Se,MousePointerSquareDashed:()=>fm,Move:()=>Em,Move3D:()=>Ae,Move3d:()=>Ae,MoveDiagonal:()=>xm,MoveDiagonal2:()=>mm,MoveDown:()=>ym,MoveDownLeft:()=>gm,MoveDownRight:()=>vm,MoveHorizontal:()=>Mm,MoveLeft:()=>bm,MoveRight:()=>Sm,MoveUp:()=>Cm,MoveUpLeft:()=>Am,MoveUpRight:()=>wm,MoveVertical:()=>Lm,Music:()=>Dm,Music2:()=>km,Music3:()=>Pm,Music4:()=>Tm,Navigation:()=>Bm,Navigation2:()=>Fm,Navigation2Off:()=>Hm,NavigationOff:()=>Vm,Network:()=>Rm,Newspaper:()=>Im,Nfc:()=>$m,Notebook:()=>Wm,NotebookPen:()=>Om,NotebookTabs:()=>Nm,NotebookText:()=>qm,NotepadText:()=>Um,NotepadTextDashed:()=>Zm,Nut:()=>_m,NutOff:()=>Gm,Octagon:()=>zm,Option:()=>jm,Orbit:()=>Xm,Outdent:()=>Km,Package:()=>ox,Package2:()=>Ym,PackageCheck:()=>Jm,PackageMinus:()=>Qm,PackageOpen:()=>tx,PackagePlus:()=>ex,PackageSearch:()=>ax,PackageX:()=>rx,PaintBucket:()=>sx,PaintRoller:()=>ix,Paintbrush:()=>lx,Paintbrush2:()=>nx,Palette:()=>dx,Palmtree:()=>cx,PanelBottom:()=>hx,PanelBottomClose:()=>px,PanelBottomDashed:()=>we,PanelBottomInactive:()=>we,PanelBottomOpen:()=>fx,PanelLeft:()=>ke,PanelLeftClose:()=>Ce,PanelLeftDashed:()=>Le,PanelLeftInactive:()=>Le,PanelLeftOpen:()=>Ee,PanelRight:()=>xx,PanelRightClose:()=>ux,PanelRightDashed:()=>Pe,PanelRightInactive:()=>Pe,PanelRightOpen:()=>mx,PanelTop:()=>yx,PanelTopClose:()=>gx,PanelTopDashed:()=>Te,PanelTopInactive:()=>Te,PanelTopOpen:()=>vx,PanelsLeftBottom:()=>Mx,PanelsLeftRight:()=>le,PanelsRightBottom:()=>bx,PanelsTopBottom:()=>Re,PanelsTopLeft:()=>De,Paperclip:()=>Sx,Parentheses:()=>Ax,ParkingCircle:()=>Cx,ParkingCircleOff:()=>wx,ParkingMeter:()=>Lx,ParkingSquare:()=>kx,ParkingSquareOff:()=>Ex,PartyPopper:()=>Px,Pause:()=>Hx,PauseCircle:()=>Tx,PauseOctagon:()=>Dx,PawPrint:()=>Fx,PcCase:()=>Vx,Pen:()=>Fe,PenBox:()=>Lt,PenLine:()=>He,PenSquare:()=>Lt,PenTool:()=>Bx,Pencil:()=>$x,PencilLine:()=>Rx,PencilRuler:()=>Ix,Pentagon:()=>Ox,Percent:()=>Zx,PercentCircle:()=>Nx,PercentDiamond:()=>qx,PercentSquare:()=>Wx,PersonStanding:()=>Ux,Phone:()=>Yx,PhoneCall:()=>Gx,PhoneForwarded:()=>_x,PhoneIncoming:()=>zx,PhoneMissed:()=>jx,PhoneOff:()=>Xx,PhoneOutgoing:()=>Kx,Pi:()=>Qx,PiSquare:()=>Jx,Piano:()=>tg,Pickaxe:()=>eg,PictureInPicture:()=>rg,PictureInPicture2:()=>ag,PieChart:()=>og,PiggyBank:()=>sg,Pilcrow:()=>ng,PilcrowSquare:()=>ig,Pill:()=>lg,Pin:()=>cg,PinOff:()=>dg,Pipette:()=>pg,Pizza:()=>fg,Plane:()=>mg,PlaneLanding:()=>hg,PlaneTakeoff:()=>ug,Play:()=>vg,PlayCircle:()=>xg,PlaySquare:()=>gg,Plug:()=>Sg,Plug2:()=>yg,PlugZap:()=>bg,PlugZap2:()=>Mg,Plus:()=>Cg,PlusCircle:()=>Ag,PlusSquare:()=>wg,Pocket:()=>Eg,PocketKnife:()=>Lg,Podcast:()=>kg,Pointer:()=>Tg,PointerOff:()=>Pg,Popcorn:()=>Dg,Popsicle:()=>Hg,PoundSterling:()=>Fg,Power:()=>Ig,PowerCircle:()=>Vg,PowerOff:()=>Bg,PowerSquare:()=>Rg,Presentation:()=>$g,Printer:()=>Og,Projector:()=>Ng,Puzzle:()=>qg,Pyramid:()=>Wg,QrCode:()=>Zg,Quote:()=>Ug,Rabbit:()=>Gg,Radar:()=>_g,Radiation:()=>zg,Radical:()=>jg,Radio:()=>Yg,RadioReceiver:()=>Xg,RadioTower:()=>Kg,Radius:()=>Jg,RailSymbol:()=>Qg,Rainbow:()=>tv,Rat:()=>ev,Ratio:()=>av,Receipt:()=>pv,ReceiptCent:()=>rv,ReceiptEuro:()=>ov,ReceiptIndianRupee:()=>sv,ReceiptJapaneseYen:()=>iv,ReceiptPoundSterling:()=>nv,ReceiptRussianRuble:()=>lv,ReceiptSwissFranc:()=>dv,ReceiptText:()=>cv,RectangleHorizontal:()=>fv,RectangleVertical:()=>hv,Recycle:()=>uv,Redo:()=>gv,Redo2:()=>mv,RedoDot:()=>xv,RefreshCcw:()=>yv,RefreshCcwDot:()=>vv,RefreshCw:()=>bv,RefreshCwOff:()=>Mv,Refrigerator:()=>Sv,Regex:()=>Av,RemoveFormatting:()=>wv,Repeat:()=>Ev,Repeat1:()=>Cv,Repeat2:()=>Lv,Replace:()=>Pv,ReplaceAll:()=>kv,Reply:()=>Dv,ReplyAll:()=>Tv,Rewind:()=>Hv,Ribbon:()=>Fv,Rocket:()=>Vv,RockingChair:()=>Bv,RollerCoaster:()=>Rv,Rotate3D:()=>Ve,Rotate3d:()=>Ve,RotateCcw:()=>Iv,RotateCw:()=>$v,Route:()=>Nv,RouteOff:()=>Ov,Router:()=>qv,Rows:()=>Be,Rows2:()=>Be,Rows3:()=>Re,Rows4:()=>Wv,Rss:()=>Zv,Ruler:()=>Uv,RussianRuble:()=>Gv,Sailboat:()=>_v,Salad:()=>zv,Sandwich:()=>jv,Satellite:()=>Kv,SatelliteDish:()=>Xv,Save:()=>Jv,SaveAll:()=>Yv,Scale:()=>Qv,Scale3D:()=>Ie,Scale3d:()=>Ie,Scaling:()=>t4,Scan:()=>n4,ScanBarcode:()=>e4,ScanEye:()=>a4,ScanFace:()=>r4,ScanLine:()=>o4,ScanSearch:()=>s4,ScanText:()=>i4,ScatterChart:()=>l4,School:()=>c4,School2:()=>d4,Scissors:()=>u4,ScissorsLineDashed:()=>p4,ScissorsSquare:()=>h4,ScissorsSquareDashedBottom:()=>f4,ScreenShare:()=>x4,ScreenShareOff:()=>m4,Scroll:()=>v4,ScrollText:()=>g4,Search:()=>A4,SearchCheck:()=>y4,SearchCode:()=>M4,SearchSlash:()=>b4,SearchX:()=>S4,Send:()=>C4,SendHorizonal:()=>$e,SendHorizontal:()=>$e,SendToBack:()=>w4,SeparatorHorizontal:()=>L4,SeparatorVertical:()=>E4,Server:()=>D4,ServerCog:()=>k4,ServerCrash:()=>P4,ServerOff:()=>T4,Settings:()=>F4,Settings2:()=>H4,Shapes:()=>V4,Share:()=>R4,Share2:()=>B4,Sheet:()=>I4,Shell:()=>$4,Shield:()=>j4,ShieldAlert:()=>O4,ShieldBan:()=>N4,ShieldCheck:()=>q4,ShieldClose:()=>Oe,ShieldEllipsis:()=>W4,ShieldHalf:()=>Z4,ShieldMinus:()=>U4,ShieldOff:()=>G4,ShieldPlus:()=>_4,ShieldQuestion:()=>z4,ShieldX:()=>Oe,Ship:()=>K4,ShipWheel:()=>X4,Shirt:()=>Y4,ShoppingBag:()=>J4,ShoppingBasket:()=>Q4,ShoppingCart:()=>t5,Shovel:()=>e5,ShowerHead:()=>a5,Shrink:()=>r5,Shrub:()=>o5,Shuffle:()=>s5,Sidebar:()=>ke,SidebarClose:()=>Ce,SidebarOpen:()=>Ee,Sigma:()=>n5,SigmaSquare:()=>i5,Signal:()=>f5,SignalHigh:()=>l5,SignalLow:()=>d5,SignalMedium:()=>c5,SignalZero:()=>p5,Signpost:()=>u5,SignpostBig:()=>h5,Siren:()=>m5,SkipBack:()=>x5,SkipForward:()=>g5,Skull:()=>v5,Slack:()=>y5,Slash:()=>M5,SlashSquare:()=>Ne,Slice:()=>b5,Sliders:()=>A5,SlidersHorizontal:()=>S5,Smartphone:()=>L5,SmartphoneCharging:()=>w5,SmartphoneNfc:()=>C5,Smile:()=>k5,SmilePlus:()=>E5,Snail:()=>P5,Snowflake:()=>T5,Sofa:()=>D5,SortAsc:()=>Gt,SortDesc:()=>Wt,Soup:()=>H5,Space:()=>F5,Spade:()=>V5,Sparkle:()=>B5,Sparkles:()=>qe,Speaker:()=>R5,Speech:()=>I5,SpellCheck:()=>O5,SpellCheck2:()=>$5,Spline:()=>N5,Split:()=>Z5,SplitSquareHorizontal:()=>q5,SplitSquareVertical:()=>W5,SprayCan:()=>U5,Sprout:()=>G5,Square:()=>K5,SquareAsterisk:()=>zt,SquareCode:()=>ie,SquareDashedBottom:()=>z5,SquareDashedBottomCode:()=>_5,SquareDot:()=>de,SquareEqual:()=>ce,SquareGantt:()=>Pt,SquareKanban:()=>be,SquareKanbanDashed:()=>Me,SquarePen:()=>Lt,SquareRadical:()=>j5,SquareSlash:()=>Ne,SquareStack:()=>X5,SquareUser:()=>Ze,SquareUserRound:()=>We,Squircle:()=>Y5,Squirrel:()=>J5,Stamp:()=>Q5,Star:()=>a3,StarHalf:()=>t3,StarOff:()=>e3,Stars:()=>qe,StepBack:()=>r3,StepForward:()=>o3,Stethoscope:()=>s3,Sticker:()=>i3,StickyNote:()=>n3,StopCircle:()=>l3,Store:()=>d3,StretchHorizontal:()=>c3,StretchVertical:()=>p3,Strikethrough:()=>f3,Subscript:()=>h3,Subtitles:()=>te,Sun:()=>v3,SunDim:()=>u3,SunMedium:()=>m3,SunMoon:()=>x3,SunSnow:()=>g3,Sunrise:()=>y3,Sunset:()=>M3,Superscript:()=>b3,SwatchBook:()=>S3,SwissFranc:()=>A3,SwitchCamera:()=>w3,Sword:()=>C3,Swords:()=>L3,Syringe:()=>E3,Table:()=>V3,Table2:()=>k3,TableCellsMerge:()=>P3,TableCellsSplit:()=>T3,TableColumnsSplit:()=>D3,TableProperties:()=>H3,TableRowsSplit:()=>F3,Tablet:()=>R3,TabletSmartphone:()=>B3,Tablets:()=>I3,Tag:()=>$3,Tags:()=>O3,Tally1:()=>N3,Tally2:()=>q3,Tally3:()=>W3,Tally4:()=>Z3,Tally5:()=>U3,Tangent:()=>G3,Target:()=>_3,Telescope:()=>z3,Tent:()=>X3,TentTree:()=>j3,Terminal:()=>Y3,TerminalSquare:()=>K3,TestTube:()=>Q3,TestTube2:()=>J3,TestTubes:()=>ty,Text:()=>sy,TextCursor:()=>ay,TextCursorInput:()=>ey,TextQuote:()=>ry,TextSearch:()=>oy,TextSelect:()=>Ue,TextSelection:()=>Ue,Theater:()=>iy,Thermometer:()=>dy,ThermometerSnowflake:()=>ny,ThermometerSun:()=>ly,ThumbsDown:()=>cy,ThumbsUp:()=>py,Ticket:()=>vy,TicketCheck:()=>fy,TicketMinus:()=>hy,TicketPercent:()=>uy,TicketPlus:()=>my,TicketSlash:()=>xy,TicketX:()=>gy,Timer:()=>by,TimerOff:()=>yy,TimerReset:()=>My,ToggleLeft:()=>Sy,ToggleRight:()=>Ay,Tornado:()=>wy,Torus:()=>Cy,Touchpad:()=>Ey,TouchpadOff:()=>Ly,TowerControl:()=>ky,ToyBrick:()=>Py,Tractor:()=>Ty,TrafficCone:()=>Dy,Train:()=>Ge,TrainFront:()=>Fy,TrainFrontTunnel:()=>Hy,TrainTrack:()=>Vy,TramFront:()=>Ge,Trash:()=>Ry,Trash2:()=>By,TreeDeciduous:()=>Iy,TreePine:()=>$y,Trees:()=>Oy,Trello:()=>Ny,TrendingDown:()=>qy,TrendingUp:()=>Wy,Triangle:()=>Uy,TriangleRight:()=>Zy,Trophy:()=>Gy,Truck:()=>_y,Turtle:()=>zy,Tv:()=>Xy,Tv2:()=>jy,Twitch:()=>Ky,Twitter:()=>Yy,Type:()=>Jy,Umbrella:()=>tM,UmbrellaOff:()=>Qy,Underline:()=>eM,Undo:()=>oM,Undo2:()=>aM,UndoDot:()=>rM,UnfoldHorizontal:()=>sM,UnfoldVertical:()=>iM,Ungroup:()=>nM,Unlink:()=>dM,Unlink2:()=>lM,Unlock:()=>pM,UnlockKeyhole:()=>cM,Unplug:()=>fM,Upload:()=>uM,UploadCloud:()=>hM,Usb:()=>mM,User:()=>AM,User2:()=>Ye,UserCheck:()=>xM,UserCheck2:()=>_e,UserCircle:()=>re,UserCircle2:()=>ae,UserCog:()=>gM,UserCog2:()=>ze,UserMinus:()=>vM,UserMinus2:()=>je,UserPlus:()=>yM,UserPlus2:()=>Xe,UserRound:()=>Ye,UserRoundCheck:()=>_e,UserRoundCog:()=>ze,UserRoundMinus:()=>je,UserRoundPlus:()=>Xe,UserRoundSearch:()=>MM,UserRoundX:()=>Ke,UserSearch:()=>bM,UserSquare:()=>Ze,UserSquare2:()=>We,UserX:()=>SM,UserX2:()=>Ke,Users:()=>wM,Users2:()=>Je,UsersRound:()=>Je,Utensils:()=>LM,UtensilsCrossed:()=>CM,UtilityPole:()=>EM,Variable:()=>kM,Vault:()=>PM,Vegan:()=>TM,VenetianMask:()=>DM,Verified:()=>Xt,Vibrate:()=>FM,VibrateOff:()=>HM,Video:()=>BM,VideoOff:()=>VM,Videotape:()=>RM,View:()=>IM,Voicemail:()=>$M,Volume:()=>WM,Volume1:()=>OM,Volume2:()=>NM,VolumeX:()=>qM,Vote:()=>ZM,Wallet:()=>_M,Wallet2:()=>UM,WalletCards:()=>GM,Wallpaper:()=>zM,Wand:()=>XM,Wand2:()=>jM,Warehouse:()=>KM,WashingMachine:()=>YM,Watch:()=>JM,Waves:()=>QM,Waypoints:()=>t6,Webcam:()=>e6,Webhook:()=>r6,WebhookOff:()=>a6,Weight:()=>o6,Wheat:()=>i6,WheatOff:()=>s6,WholeWord:()=>n6,Wifi:()=>d6,WifiOff:()=>l6,Wind:()=>c6,Wine:()=>f6,WineOff:()=>p6,Workflow:()=>h6,WrapText:()=>u6,Wrench:()=>m6,X:()=>y6,XCircle:()=>x6,XOctagon:()=>g6,XSquare:()=>v6,Youtube:()=>M6,Zap:()=>S6,ZapOff:()=>b6,ZoomIn:()=>A6,ZoomOut:()=>w6});var t={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var ha=["svg",t,[["path",{d:"M3.5 13h6"}],["path",{d:"m2 16 4.5-9 4.5 9"}],["path",{d:"M18 7v9"}],["path",{d:"m14 12 4 4 4-4"}]]];var ua=["svg",t,[["path",{d:"M3.5 13h6"}],["path",{d:"m2 16 4.5-9 4.5 9"}],["path",{d:"M18 16V7"}],["path",{d:"m14 11 4-4 4 4"}]]];var ma=["svg",t,[["path",{d:"M21 14h-5"}],["path",{d:"M16 16v-3.5a2.5 2.5 0 0 1 5 0V16"}],["path",{d:"M4.5 13h6"}],["path",{d:"m3 16 4.5-9 4.5 9"}]]];var xa=["svg",t,[["circle",{cx:"16",cy:"4",r:"1"}],["path",{d:"m18 19 1-7-6 1"}],["path",{d:"m5 8 3-3 5.5 3-2.36 3.5"}],["path",{d:"M4.24 14.5a5 5 0 0 0 6.88 6"}],["path",{d:"M13.76 17.5a5 5 0 0 0-6.88-6"}]]];var ga=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M17 12h-2l-2 5-2-10-2 5H7"}]]];var va=["svg",t,[["path",{d:"M22 12h-4l-3 9L9 3l-3 9H2"}]]];var ya=["svg",t,[["path",{d:"M6 12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 8h12"}],["path",{d:"M18.3 17.7a2.5 2.5 0 0 1-3.16 3.83 2.53 2.53 0 0 1-1.14-2V12"}],["path",{d:"M6.6 15.6A2 2 0 1 0 10 17v-5"}]]];var Ma=["svg",t,[["path",{d:"M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"}],["polygon",{points:"12 15 17 21 7 21 12 15"}]]];var $t=["svg",t,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"m9 13 2 2 4-4"}]]];var Ot=["svg",t,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"M9 13h6"}]]];var ba=["svg",t,[["path",{d:"M6.87 6.87a8 8 0 1 0 11.26 11.26"}],["path",{d:"M19.9 14.25a8 8 0 0 0-9.15-9.15"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.26 18.67 4 21"}],["path",{d:"m2 2 20 20"}],["path",{d:"M4 4 2 6"}]]];var Nt=["svg",t,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"M12 10v6"}],["path",{d:"M9 13h6"}]]];var Sa=["svg",t,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M12 9v4l2 2"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}]]];var Aa=["svg",t,[["path",{d:"M4 8a2 2 0 0 1-2-2V3h20v3a2 2 0 0 1-2 2Z"}],["path",{d:"m19 8-.8 3c-.1.6-.6 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L5 8"}],["path",{d:"M16 21c0-2.5 2-2.5 2-5"}],["path",{d:"M11 21c0-2.5 2-2.5 2-5"}],["path",{d:"M6 21c0-2.5 2-2.5 2-5"}]]];var wa=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["polyline",{points:"11 3 11 11 14 8 17 11 17 3"}]]];var Ca=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];var La=["svg",t,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];var Ea=["svg",t,[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"}],["path",{d:"M12 9v4"}],["path",{d:"M12 17h.01"}]]];var ka=["svg",t,[["path",{d:"M2 12h20"}],["path",{d:"M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"}],["path",{d:"M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4"}],["path",{d:"M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1"}],["path",{d:"M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1"}]]];var Pa=["svg",t,[["path",{d:"M12 2v20"}],["path",{d:"M8 10H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h4"}],["path",{d:"M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"}],["path",{d:"M8 20H7a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h1"}],["path",{d:"M16 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1"}]]];var Ta=["svg",t,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"17",x2:"7",y1:"12",y2:"12"}],["line",{x1:"19",x2:"5",y1:"18",y2:"18"}]]];var Da=["svg",t,[["rect",{width:"6",height:"16",x:"4",y:"2",rx:"2"}],["rect",{width:"6",height:"9",x:"14",y:"9",rx:"2"}],["path",{d:"M22 22H2"}]]];var Ha=["svg",t,[["rect",{width:"16",height:"6",x:"2",y:"4",rx:"2"}],["rect",{width:"9",height:"6",x:"9",y:"14",rx:"2"}],["path",{d:"M22 22V2"}]]];var Fa=["svg",t,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M17 22v-5"}],["path",{d:"M17 7V2"}],["path",{d:"M7 22v-3"}],["path",{d:"M7 5V2"}]]];var Va=["svg",t,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M10 2v20"}],["path",{d:"M20 2v20"}]]];var Ba=["svg",t,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M4 2v20"}],["path",{d:"M14 2v20"}]]];var Ra=["svg",t,[["rect",{width:"6",height:"14",x:"2",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"16",y:"7",rx:"2"}],["path",{d:"M12 2v20"}]]];var Ia=["svg",t,[["rect",{width:"6",height:"14",x:"2",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"12",y:"7",rx:"2"}],["path",{d:"M22 2v20"}]]];var $a=["svg",t,[["rect",{width:"6",height:"14",x:"6",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"16",y:"7",rx:"2"}],["path",{d:"M2 2v20"}]]];var Oa=["svg",t,[["rect",{width:"6",height:"10",x:"9",y:"7",rx:"2"}],["path",{d:"M4 22V2"}],["path",{d:"M20 22V2"}]]];var Na=["svg",t,[["rect",{width:"6",height:"14",x:"3",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"15",y:"7",rx:"2"}],["path",{d:"M3 2v20"}],["path",{d:"M21 2v20"}]]];var qa=["svg",t,[["line",{x1:"3",x2:"21",y1:"6",y2:"6"}],["line",{x1:"3",x2:"21",y1:"12",y2:"12"}],["line",{x1:"3",x2:"21",y1:"18",y2:"18"}]]];var Wa=["svg",t,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12"}],["line",{x1:"17",x2:"3",y1:"18",y2:"18"}]]];var Za=["svg",t,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}],["line",{x1:"21",x2:"7",y1:"18",y2:"18"}]]];var Ua=["svg",t,[["rect",{width:"6",height:"16",x:"4",y:"6",rx:"2"}],["rect",{width:"6",height:"9",x:"14",y:"6",rx:"2"}],["path",{d:"M22 2H2"}]]];var Ga=["svg",t,[["rect",{width:"9",height:"6",x:"6",y:"14",rx:"2"}],["rect",{width:"16",height:"6",x:"6",y:"4",rx:"2"}],["path",{d:"M2 2v20"}]]];var _a=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"14",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"4",rx:"2"}],["path",{d:"M22 7h-5"}],["path",{d:"M7 7H1"}],["path",{d:"M22 17h-3"}],["path",{d:"M5 17H2"}]]];var za=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"14",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"4",rx:"2"}],["path",{d:"M2 20h20"}],["path",{d:"M2 10h20"}]]];var ja=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"14",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"4",rx:"2"}],["path",{d:"M2 14h20"}],["path",{d:"M2 4h20"}]]];var Xa=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"16",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"2",rx:"2"}],["path",{d:"M2 12h20"}]]];var Ka=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"12",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"2",rx:"2"}],["path",{d:"M2 22h20"}]]];var Ya=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"16",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"6",rx:"2"}],["path",{d:"M2 2h20"}]]];var Ja=["svg",t,[["rect",{width:"10",height:"6",x:"7",y:"9",rx:"2"}],["path",{d:"M22 20H2"}],["path",{d:"M22 4H2"}]]];var Qa=["svg",t,[["rect",{width:"14",height:"6",x:"5",y:"15",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"3",rx:"2"}],["path",{d:"M2 21h20"}],["path",{d:"M2 3h20"}]]];var tr=["svg",t,[["path",{d:"M10 10H6"}],["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"}],["path",{d:"M8 8v4"}],["path",{d:"M9 18h6"}],["circle",{cx:"17",cy:"18",r:"2"}],["circle",{cx:"7",cy:"18",r:"2"}]]];var er=["svg",t,[["path",{d:"M17.5 12c0 4.4-3.6 8-8 8A4.5 4.5 0 0 1 5 15.5c0-6 8-4 8-8.5a3 3 0 1 0-6 0c0 3 2.5 8.5 12 13"}],["path",{d:"M16 12h3"}]]];var ar=["svg",t,[["path",{d:"M10 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5"}],["path",{d:"M22 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5"}]]];var rr=["svg",t,[["path",{d:"M12 22V8"}],["path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}],["circle",{cx:"12",cy:"5",r:"3"}]]];var or=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2"}],["path",{d:"M7.5 8 10 9"}],["path",{d:"m14 9 2.5-1"}],["path",{d:"M9 10h0"}],["path",{d:"M15 10h0"}]]];var sr=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 15h8"}],["path",{d:"M8 9h2"}],["path",{d:"M14 9h2"}]]];var ir=["svg",t,[["path",{d:"M2 12 7 2"}],["path",{d:"m7 12 5-10"}],["path",{d:"m12 12 5-10"}],["path",{d:"m17 12 5-10"}],["path",{d:"M4.5 7h15"}],["path",{d:"M12 16v6"}]]];var nr=["svg",t,[["path",{d:"M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4"}],["path",{d:"M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z"}],["path",{d:"M9 12v5"}],["path",{d:"M15 12v5"}],["path",{d:"M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1"}]]];var lr=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m14.31 8 5.74 9.94"}],["path",{d:"M9.69 8h11.48"}],["path",{d:"m7.38 12 5.74-9.94"}],["path",{d:"M9.69 16 3.95 6.06"}],["path",{d:"M14.31 16H2.83"}],["path",{d:"m16.62 12-5.74 9.94"}]]];var dr=["svg",t,[["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2"}],["path",{d:"M10 4v4"}],["path",{d:"M2 8h20"}],["path",{d:"M6 4v4"}]]];var cr=["svg",t,[["path",{d:"M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"}],["path",{d:"M10 2c1 .5 2 2 2 5"}]]];var pr=["svg",t,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2"}],["path",{d:"m9 15 3-3 3 3"}],["path",{d:"M12 12v9"}]]];var fr=["svg",t,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"}],["path",{d:"m9.5 17 5-5"}],["path",{d:"m9.5 12 5 5"}]]];var hr=["svg",t,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"}],["path",{d:"M10 12h4"}]]];var ur=["svg",t,[["path",{d:"M3 3v18h18"}],["path",{d:"M7 12v5h12V8l-5 5-4-4Z"}]]];var mr=["svg",t,[["path",{d:"M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"}],["path",{d:"M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];var xr=["svg",t,[["path",{d:"M15 5H9"}],["path",{d:"M15 9v3h4l-7 7-7-7h4V9z"}]]];var gr=["svg",t,[["path",{d:"M15 6v6h4l-7 7-7-7h4V6h6z"}]]];var vr=["svg",t,[["path",{d:"M19 15V9"}],["path",{d:"M15 15h-3v4l-7-7 7-7v4h3v6z"}]]];var yr=["svg",t,[["path",{d:"M18 15h-6v4l-7-7 7-7v4h6v6z"}]]];var Mr=["svg",t,[["path",{d:"M5 9v6"}],["path",{d:"M9 9h3V5l7 7-7 7v-4H9V9z"}]]];var br=["svg",t,[["path",{d:"M6 9h6V5l7 7-7 7v-4H6V9z"}]]];var Sr=["svg",t,[["path",{d:"M9 19h6"}],["path",{d:"M9 15v-3H5l7-7 7 7h-4v3H9z"}]]];var Ar=["svg",t,[["path",{d:"M9 18v-6H5l7-7 7 7h-4v6H9z"}]]];var wr=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["rect",{x:"15",y:"4",width:"4",height:"6",ry:"2"}],["path",{d:"M17 20v-6h-2"}],["path",{d:"M15 20h4"}]]];var Cr=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M17 10V4h-2"}],["path",{d:"M15 10h4"}],["rect",{x:"15",y:"14",width:"4",height:"6",ry:"2"}]]];var qt=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M20 8h-5"}],["path",{d:"M15 10V6.5a2.5 2.5 0 0 1 5 0V10"}],["path",{d:"M15 14h5l-5 6h5"}]]];var Lr=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 8v8"}],["path",{d:"m8 12 4 4 4-4"}]]];var Er=["svg",t,[["path",{d:"M19 3H5"}],["path",{d:"M12 21V7"}],["path",{d:"m6 15 6 6 6-6"}]]];var kr=["svg",t,[["path",{d:"M2 12a10 10 0 1 1 10 10"}],["path",{d:"m2 22 10-10"}],["path",{d:"M8 22H2v-6"}]]];var Pr=["svg",t,[["path",{d:"M13 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6"}],["path",{d:"m3 21 9-9"}],["path",{d:"M9 21H3v-6"}]]];var Tr=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 8-8 8"}],["path",{d:"M16 16H8V8"}]]];var Dr=["svg",t,[["path",{d:"M17 7 7 17"}],["path",{d:"M17 17H7V7"}]]];var Hr=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M11 4h4"}],["path",{d:"M11 8h7"}],["path",{d:"M11 12h10"}]]];var Fr=["svg",t,[["path",{d:"M12 22a10 10 0 1 1 10-10"}],["path",{d:"M22 22 12 12"}],["path",{d:"M22 16v6h-6"}]]];var Vr=["svg",t,[["path",{d:"M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"}],["path",{d:"m21 21-9-9"}],["path",{d:"M21 15v6h-6"}]]];var Br=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m8 8 8 8"}],["path",{d:"M16 8v8H8"}]]];var Rr=["svg",t,[["path",{d:"m7 7 10 10"}],["path",{d:"M17 7v10H7"}]]];var Ir=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 8v8"}],["path",{d:"m8 12 4 4 4-4"}]]];var $r=["svg",t,[["path",{d:"M12 2v14"}],["path",{d:"m19 9-7 7-7-7"}],["circle",{cx:"12",cy:"21",r:"1"}]]];var Or=["svg",t,[["path",{d:"M12 17V3"}],["path",{d:"m6 11 6 6 6-6"}],["path",{d:"M19 21H5"}]]];var Nr=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"m21 8-4-4-4 4"}],["path",{d:"M17 4v16"}]]];var Wt=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M11 4h10"}],["path",{d:"M11 8h7"}],["path",{d:"M11 12h4"}]]];var Zt=["svg",t,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 4v16"}],["path",{d:"M15 4h5l-5 6h5"}],["path",{d:"M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"}],["path",{d:"M20 18h-5"}]]];var qr=["svg",t,[["path",{d:"M12 5v14"}],["path",{d:"m19 12-7 7-7-7"}]]];var Wr=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 12H8"}],["path",{d:"m12 8-4 4 4 4"}]]];var Zr=["svg",t,[["path",{d:"m9 6-6 6 6 6"}],["path",{d:"M3 12h14"}],["path",{d:"M21 19V5"}]]];var Ur=["svg",t,[["path",{d:"M8 3 4 7l4 4"}],["path",{d:"M4 7h16"}],["path",{d:"m16 21 4-4-4-4"}],["path",{d:"M20 17H4"}]]];var Gr=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m12 8-4 4 4 4"}],["path",{d:"M16 12H8"}]]];var _r=["svg",t,[["path",{d:"M3 19V5"}],["path",{d:"m13 6-6 6 6 6"}],["path",{d:"M7 12h14"}]]];var zr=["svg",t,[["path",{d:"m12 19-7-7 7-7"}],["path",{d:"M19 12H5"}]]];var jr=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}],["path",{d:"m12 16 4-4-4-4"}]]];var Xr=["svg",t,[["path",{d:"M3 5v14"}],["path",{d:"M21 12H7"}],["path",{d:"m15 18 6-6-6-6"}]]];var Kr=["svg",t,[["path",{d:"m16 3 4 4-4 4"}],["path",{d:"M20 7H4"}],["path",{d:"m8 21-4-4 4-4"}],["path",{d:"M4 17h16"}]]];var Yr=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"m12 16 4-4-4-4"}]]];var Jr=["svg",t,[["path",{d:"M17 12H3"}],["path",{d:"m11 18 6-6-6-6"}],["path",{d:"M21 5v14"}]]];var Qr=["svg",t,[["path",{d:"M5 12h14"}],["path",{d:"m12 5 7 7-7 7"}]]];var to=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["rect",{x:"15",y:"4",width:"4",height:"6",ry:"2"}],["path",{d:"M17 20v-6h-2"}],["path",{d:"M15 20h4"}]]];var eo=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M17 10V4h-2"}],["path",{d:"M15 10h4"}],["rect",{x:"15",y:"14",width:"4",height:"6",ry:"2"}]]];var Ut=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M20 8h-5"}],["path",{d:"M15 10V6.5a2.5 2.5 0 0 1 5 0V10"}],["path",{d:"M15 14h5l-5 6h5"}]]];var ao=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m16 12-4-4-4 4"}],["path",{d:"M12 16V8"}]]];var ro=["svg",t,[["path",{d:"m21 16-4 4-4-4"}],["path",{d:"M17 20V4"}],["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}]]];var oo=["svg",t,[["path",{d:"m5 9 7-7 7 7"}],["path",{d:"M12 16V2"}],["circle",{cx:"12",cy:"21",r:"1"}]]];var so=["svg",t,[["path",{d:"m18 9-6-6-6 6"}],["path",{d:"M12 3v14"}],["path",{d:"M5 21h14"}]]];var io=["svg",t,[["path",{d:"M2 8V2h6"}],["path",{d:"m2 2 10 10"}],["path",{d:"M12 2A10 10 0 1 1 2 12"}]]];var no=["svg",t,[["path",{d:"M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"}],["path",{d:"m3 3 9 9"}],["path",{d:"M3 9V3h6"}]]];var lo=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 16V8h8"}],["path",{d:"M16 16 8 8"}]]];var co=["svg",t,[["path",{d:"M7 17V7h10"}],["path",{d:"M17 17 7 7"}]]];var Gt=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M11 12h4"}],["path",{d:"M11 16h7"}],["path",{d:"M11 20h10"}]]];var po=["svg",t,[["path",{d:"M22 12A10 10 0 1 1 12 2"}],["path",{d:"M22 2 12 12"}],["path",{d:"M16 2h6v6"}]]];var fo=["svg",t,[["path",{d:"M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"}],["path",{d:"m21 3-9 9"}],["path",{d:"M15 3h6v6"}]]];var ho=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 8h8v8"}],["path",{d:"m8 16 8-8"}]]];var uo=["svg",t,[["path",{d:"M7 7h10v10"}],["path",{d:"M7 17 17 7"}]]];var mo=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 12-4-4-4 4"}],["path",{d:"M12 16V8"}]]];var xo=["svg",t,[["path",{d:"M5 3h14"}],["path",{d:"m18 13-6-6-6 6"}],["path",{d:"M12 7v14"}]]];var go=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M11 12h10"}],["path",{d:"M11 16h7"}],["path",{d:"M11 20h4"}]]];var _t=["svg",t,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M15 4h5l-5 6h5"}],["path",{d:"M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"}],["path",{d:"M20 18h-5"}]]];var vo=["svg",t,[["path",{d:"m5 12 7-7 7 7"}],["path",{d:"M12 19V5"}]]];var yo=["svg",t,[["path",{d:"m4 6 3-3 3 3"}],["path",{d:"M7 17V3"}],["path",{d:"m14 6 3-3 3 3"}],["path",{d:"M17 17V3"}],["path",{d:"M4 21h16"}]]];var zt=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 8v8"}],["path",{d:"m8.5 14 7-4"}],["path",{d:"m8.5 10 7 4"}]]];var Mo=["svg",t,[["path",{d:"M12 6v12"}],["path",{d:"M17.196 9 6.804 15"}],["path",{d:"m6.804 9 10.392 6"}]]];var bo=["svg",t,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"}]]];var So=["svg",t,[["circle",{cx:"12",cy:"12",r:"1"}],["path",{d:"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"}],["path",{d:"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"}]]];var Ao=["svg",t,[["path",{d:"M2 10v3"}],["path",{d:"M6 6v11"}],["path",{d:"M10 3v18"}],["path",{d:"M14 8v7"}],["path",{d:"M18 5v13"}],["path",{d:"M22 10v3"}]]];var wo=["svg",t,[["path",{d:"M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"}]]];var Co=["svg",t,[["circle",{cx:"12",cy:"8",r:"6"}],["path",{d:"M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"}]]];var Lo=["svg",t,[["path",{d:"m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"}],["path",{d:"M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"}]]];var jt=["svg",t,[["path",{d:"M4 4v16h16"}],["path",{d:"m4 20 7-7"}]]];var Eo=["svg",t,[["path",{d:"M9 12h.01"}],["path",{d:"M15 12h.01"}],["path",{d:"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"}],["path",{d:"M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"}]]];var ko=["svg",t,[["path",{d:"M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"}],["path",{d:"M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"}],["path",{d:"M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"}],["path",{d:"M8 10h8"}],["path",{d:"M8 18h8"}]]];var Po=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];var To=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M12 7v10"}],["path",{d:"M15.4 10a4 4 0 1 0 0 4"}]]];var Xt=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m9 12 2 2 4-4"}]]];var Do=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 18V6"}]]];var Ho=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M7 12h5"}],["path",{d:"M15 9.4a4 4 0 1 0 0 5.2"}]]];var Fo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["line",{x1:"12",x2:"12.01",y1:"17",y2:"17"}]]];var Vo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M8 8h8"}],["path",{d:"M8 12h8"}],["path",{d:"m13 17-5-1h1a4 4 0 0 0 0-8"}]]];var Bo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"16",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"8",y2:"8"}]]];var Ro=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m9 8 3 3v7"}],["path",{d:"m12 11 3-3"}],["path",{d:"M9 12h6"}],["path",{d:"M9 16h6"}]]];var Io=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];var $o=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];var Oo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"8",y2:"16"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];var No=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M8 12h4"}],["path",{d:"M10 16V9.5a2.5 2.5 0 0 1 5 0"}],["path",{d:"M8 16h7"}]]];var qo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M9 16h5"}],["path",{d:"M9 12h5a2 2 0 1 0 0-4h-3v9"}]]];var Wo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M11 17V8h4"}],["path",{d:"M11 12h3"}],["path",{d:"M9 16h4"}]]];var Zo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"15",x2:"9",y1:"9",y2:"15"}],["line",{x1:"9",x2:"15",y1:"9",y2:"15"}]]];var Uo=["svg",t,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}]]];var Go=["svg",t,[["path",{d:"M22 18H6a2 2 0 0 1-2-2V7a2 2 0 0 0-2-2"}],["path",{d:"M17 14V4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v10"}],["rect",{width:"13",height:"8",x:"8",y:"6",rx:"1"}],["circle",{cx:"18",cy:"20",r:"2"}],["circle",{cx:"9",cy:"20",r:"2"}]]];var _o=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m4.9 4.9 14.2 14.2"}]]];var zo=["svg",t,[["path",{d:"M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5"}],["path",{d:"M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z"}]]];var jo=["svg",t,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M6 12h.01M18 12h.01"}]]];var Xo=["svg",t,[["line",{x1:"18",x2:"18",y1:"20",y2:"10"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14"}]]];var Ko=["svg",t,[["path",{d:"M3 3v18h18"}],["path",{d:"M18 17V9"}],["path",{d:"M13 17V5"}],["path",{d:"M8 17v-3"}]]];var Yo=["svg",t,[["path",{d:"M3 3v18h18"}],["path",{d:"M13 17V9"}],["path",{d:"M18 17V5"}],["path",{d:"M8 17v-3"}]]];var Jo=["svg",t,[["path",{d:"M3 3v18h18"}],["rect",{width:"4",height:"7",x:"7",y:"10",rx:"1"}],["rect",{width:"4",height:"12",x:"15",y:"5",rx:"1"}]]];var Qo=["svg",t,[["path",{d:"M3 3v18h18"}],["rect",{width:"12",height:"4",x:"7",y:"5",rx:"1"}],["rect",{width:"7",height:"4",x:"7",y:"13",rx:"1"}]]];var ts=["svg",t,[["path",{d:"M3 3v18h18"}],["path",{d:"M7 16h8"}],["path",{d:"M7 11h12"}],["path",{d:"M7 6h3"}]]];var es=["svg",t,[["line",{x1:"12",x2:"12",y1:"20",y2:"10"}],["line",{x1:"18",x2:"18",y1:"20",y2:"4"}],["line",{x1:"6",x2:"6",y1:"20",y2:"16"}]]];var as=["svg",t,[["path",{d:"M3 5v14"}],["path",{d:"M8 5v14"}],["path",{d:"M12 5v14"}],["path",{d:"M17 5v14"}],["path",{d:"M21 5v14"}]]];var rs=["svg",t,[["path",{d:"M4 20h16"}],["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}]]];var os=["svg",t,[["path",{d:"M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"}],["line",{x1:"10",x2:"8",y1:"5",y2:"7"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"7",x2:"7",y1:"19",y2:"21"}],["line",{x1:"17",x2:"17",y1:"19",y2:"21"}]]];var ss=["svg",t,[["path",{d:"M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"}],["path",{d:"m11 7-3 5h4l-3 5"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}]]];var is=["svg",t,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"11",y2:"13"}],["line",{x1:"14",x2:"14",y1:"11",y2:"13"}]]];var ns=["svg",t,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}]]];var ls=["svg",t,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"11",y2:"13"}]]];var ds=["svg",t,[["path",{d:"M14 7h2a2 2 0 0 1 2 2v6c0 1-1 2-2 2h-2"}],["path",{d:"M6 7H4a2 2 0 0 0-2 2v6c0 1 1 2 2 2h2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"7",y2:"13"}],["line",{x1:"10",x2:"10",y1:"17",y2:"17.01"}]]];var cs=["svg",t,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}]]];var ps=["svg",t,[["path",{d:"M4.5 3h15"}],["path",{d:"M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"}],["path",{d:"M6 14h12"}]]];var fs=["svg",t,[["path",{d:"M9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22a13.96 13.96 0 0 0 9.9-4.1"}],["path",{d:"M10.75 5.093A6 6 0 0 1 22 8c0 2.411-.61 4.68-1.683 6.66"}],["path",{d:"M5.341 10.62a4 4 0 0 0 6.487 1.208M10.62 5.341a4.015 4.015 0 0 1 2.039 2.04"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var hs=["svg",t,[["path",{d:"M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z"}],["path",{d:"M5.341 10.62a4 4 0 1 0 5.279-5.28"}]]];var us=["svg",t,[["path",{d:"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"}],["path",{d:"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"}],["path",{d:"M12 4v6"}],["path",{d:"M2 18h20"}]]];var ms=["svg",t,[["path",{d:"M3 20v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"}],["path",{d:"M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"}],["path",{d:"M3 18h18"}]]];var xs=["svg",t,[["path",{d:"M2 4v16"}],["path",{d:"M2 8h18a2 2 0 0 1 2 2v10"}],["path",{d:"M2 17h20"}],["path",{d:"M6 8v9"}]]];var gs=["svg",t,[["circle",{cx:"12.5",cy:"8.5",r:"2.5"}],["path",{d:"M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"}],["path",{d:"m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"}]]];var vs=["svg",t,[["path",{d:"M17 11h1a3 3 0 0 1 0 6h-1"}],["path",{d:"M9 12v6"}],["path",{d:"M13 12v6"}],["path",{d:"M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"}],["path",{d:"M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"}]]];var ys=["svg",t,[["path",{d:"M19.4 14.9C20.2 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 .7 0 1.3.1 1.9.3"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["circle",{cx:"18",cy:"8",r:"3"}]]];var Ms=["svg",t,[["path",{d:"M18.8 4A6.3 8.7 0 0 1 20 9"}],["path",{d:"M9 9h.01"}],["circle",{cx:"9",cy:"9",r:"7"}],["rect",{width:"10",height:"6",x:"4",y:"16",rx:"2"}],["path",{d:"M14 19c3 0 4.6-1.6 4.6-1.6"}],["circle",{cx:"20",cy:"16",r:"2"}]]];var bs=["svg",t,[["path",{d:"M18.4 12c.8 3.8 2.6 5 2.6 5H3s3-2 3-9c0-3.3 2.7-6 6-6 1.8 0 3.4.8 4.5 2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M15 8h6"}]]];var Ss=["svg",t,[["path",{d:"M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"}],["path",{d:"M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"m2 2 20 20"}]]];var As=["svg",t,[["path",{d:"M19.3 14.8C20.1 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 1 0 1.9.2 2.8.7"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M15 8h6"}],["path",{d:"M18 5v6"}]]];var ws=["svg",t,[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M4 2C2.8 3.7 2 5.7 2 8"}],["path",{d:"M22 8c0-2.3-.8-4.3-2-6"}]]];var Cs=["svg",t,[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}]]];var Kt=["svg",t,[["rect",{width:"13",height:"7",x:"3",y:"3",rx:"1"}],["path",{d:"m22 15-3-3 3-3"}],["rect",{width:"13",height:"7",x:"3",y:"14",rx:"1"}]]];var Yt=["svg",t,[["rect",{width:"13",height:"7",x:"8",y:"3",rx:"1"}],["path",{d:"m2 9 3 3-3 3"}],["rect",{width:"13",height:"7",x:"8",y:"14",rx:"1"}]]];var Ls=["svg",t,[["rect",{width:"7",height:"13",x:"3",y:"3",rx:"1"}],["path",{d:"m9 22 3-3 3 3"}],["rect",{width:"7",height:"13",x:"14",y:"3",rx:"1"}]]];var Es=["svg",t,[["rect",{width:"7",height:"13",x:"3",y:"8",rx:"1"}],["path",{d:"m15 2-3 3-3-3"}],["rect",{width:"7",height:"13",x:"14",y:"8",rx:"1"}]]];var ks=["svg",t,[["circle",{cx:"18.5",cy:"17.5",r:"3.5"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5"}],["circle",{cx:"15",cy:"5",r:"1"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2"}]]];var Ps=["svg",t,[["rect",{x:"14",y:"14",width:"4",height:"6",rx:"2"}],["rect",{x:"6",y:"4",width:"4",height:"6",rx:"2"}],["path",{d:"M6 20h4"}],["path",{d:"M14 10h4"}],["path",{d:"M6 14h2v6"}],["path",{d:"M14 4h2v6"}]]];var Ts=["svg",t,[["circle",{cx:"12",cy:"11.9",r:"2"}],["path",{d:"M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 9 3.7 9.6 2 11.6"}],["path",{d:"m8.9 10.1 1.4.8"}],["path",{d:"M17.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4-1.2 5.2-.6 6.9 1.5"}],["path",{d:"m15.1 10.1-1.4.8"}],["path",{d:"M16.7 20.8c-2.6-.4-4.6-2.6-4.7-5.3-.2 2.6-2.1 4.8-4.7 5.2"}],["path",{d:"M12 13.9v1.6"}],["path",{d:"M13.5 5.4c-1-.2-2-.2-3 0"}],["path",{d:"M17 16.4c.7-.7 1.2-1.6 1.5-2.5"}],["path",{d:"M5.5 13.9c.3.9.8 1.8 1.5 2.5"}]]];var Ds=["svg",t,[["path",{d:"M16 7h.01"}],["path",{d:"M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"}],["path",{d:"m20 7 2 .5-2 .5"}],["path",{d:"M10 18v3"}],["path",{d:"M14 17.75V21"}],["path",{d:"M7 18a6 6 0 0 0 3.84-10.61"}]]];var Hs=["svg",t,[["path",{d:"M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"}]]];var Fs=["svg",t,[["circle",{cx:"9",cy:"9",r:"7"}],["circle",{cx:"15",cy:"15",r:"7"}]]];var Vs=["svg",t,[["path",{d:"M3 3h18"}],["path",{d:"M20 7H8"}],["path",{d:"M20 11H8"}],["path",{d:"M10 19h10"}],["path",{d:"M8 15h12"}],["path",{d:"M4 3v14"}],["circle",{cx:"4",cy:"19",r:"2"}]]];var Bs=["svg",t,[["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["path",{d:"M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"}]]];var Rs=["svg",t,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}],["line",{x1:"18",x2:"21",y1:"12",y2:"12"}],["line",{x1:"3",x2:"6",y1:"12",y2:"12"}]]];var Is=["svg",t,[["path",{d:"m17 17-5 5V12l-5 5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M14.5 9.5 17 7l-5-5v4.5"}]]];var $s=["svg",t,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}],["path",{d:"M20.83 14.83a4 4 0 0 0 0-5.66"}],["path",{d:"M18 12h.01"}]]];var Os=["svg",t,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}]]];var Ns=["svg",t,[["path",{d:"M14 12a4 4 0 0 0 0-8H6v8"}],["path",{d:"M15 20a4 4 0 0 0 0-8H6v8Z"}]]];var qs=["svg",t,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}],["circle",{cx:"12",cy:"12",r:"4"}]]];var Ws=["svg",t,[["circle",{cx:"11",cy:"13",r:"9"}],["path",{d:"M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95"}],["path",{d:"m22 2-1.5 1.5"}]]];var Zs=["svg",t,[["path",{d:"M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"}]]];var Us=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m8 13 4-7 4 7"}],["path",{d:"M9.1 11h5.7"}]]];var Gs=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M8 8v3"}],["path",{d:"M12 6v7"}],["path",{d:"M16 8v3"}]]];var _s=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m9 9.5 2 2 4-4"}]]];var zs=["svg",t,[["path",{d:"M2 16V4a2 2 0 0 1 2-2h11"}],["path",{d:"M5 14H4a2 2 0 1 0 0 4h1"}],["path",{d:"M22 18H11a2 2 0 1 0 0 4h11V6H11a2 2 0 0 0-2 2v12"}]]];var Jt=["svg",t,[["path",{d:"M20 22h-2"}],["path",{d:"M20 15v2h-2"}],["path",{d:"M4 19.5V15"}],["path",{d:"M20 8v3"}],["path",{d:"M18 2h2v2"}],["path",{d:"M4 11V9"}],["path",{d:"M12 2h2"}],["path",{d:"M12 22h2"}],["path",{d:"M12 17h2"}],["path",{d:"M8 22H6.5a2.5 2.5 0 0 1 0-5H8"}],["path",{d:"M4 5v-.5A2.5 2.5 0 0 1 6.5 2H8"}]]];var js=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3 3 3-3"}]]];var Xs=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"9",cy:"12",r:"1"}],["path",{d:"M8 12v-2a4 4 0 0 1 8 0v2"}],["circle",{cx:"15",cy:"12",r:"1"}]]];var Ks=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M16 8.2C16 7 15 6 13.8 6c-.8 0-1.4.3-1.8.9-.4-.6-1-.9-1.8-.9C9 6 8 7 8 8.2c0 .6.3 1.2.7 1.6h0C10 11.1 12 13 12 13s2-1.9 3.3-3.1h0c.4-.4.7-1 .7-1.7z"}]]];var Ys=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"10",cy:"8",r:"2"}],["path",{d:"m20 13.7-2.1-2.1c-.8-.8-2-.8-2.8 0L9.7 17"}]]];var Js=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H14"}],["path",{d:"M20 8v14H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"14",cy:"8",r:"2"}],["path",{d:"m20 2-4.5 4.5"}],["path",{d:"m19 3 1 1"}]]];var Qs=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H10"}],["path",{d:"M20 15v7H6.5a2.5 2.5 0 0 1 0-5H20"}],["rect",{width:"8",height:"5",x:"12",y:"6",rx:"1"}],["path",{d:"M18 6V4a2 2 0 1 0-4 0v2"}]]];var ti=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["polyline",{points:"10 2 10 10 13 7 16 10 16 2"}]]];var ei=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M9 10h6"}]]];var ai=["svg",t,[["path",{d:"M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"}],["path",{d:"m16 12 2 2 4-4"}],["path",{d:"M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"}]]];var ri=["svg",t,[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"}],["path",{d:"M6 8h2"}],["path",{d:"M6 12h2"}],["path",{d:"M16 8h2"}],["path",{d:"M16 12h2"}]]];var oi=["svg",t,[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"}]]];var si=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M9 10h6"}],["path",{d:"M12 7v6"}]]];var ii=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M8 7h6"}],["path",{d:"M8 11h8"}]]];var ni=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M16 8V6H8v2"}],["path",{d:"M12 6v7"}],["path",{d:"M10 13h4"}]]];var li=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2"}],["path",{d:"M18 2h2v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3-3 3 3"}],["path",{d:"m9 5 3-3 3 3"}]]];var di=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3-3 3 3"}]]];var ci=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M15 13a3 3 0 1 0-6 0"}]]];var pi=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m14.5 7-5 5"}],["path",{d:"m9.5 7 5 5"}]]];var fi=["svg",t,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}]]];var hi=["svg",t,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"}],["path",{d:"m9 10 2 2 4-4"}]]];var ui=["svg",t,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}],["line",{x1:"15",x2:"9",y1:"10",y2:"10"}]]];var mi=["svg",t,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}],["line",{x1:"12",x2:"12",y1:"7",y2:"13"}],["line",{x1:"15",x2:"9",y1:"10",y2:"10"}]]];var xi=["svg",t,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"}],["path",{d:"m14.5 7.5-5 5"}],["path",{d:"m9.5 7.5 5 5"}]]];var gi=["svg",t,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}]]];var vi=["svg",t,[["path",{d:"M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"}],["path",{d:"M8 8v1"}],["path",{d:"M12 8v1"}],["path",{d:"M16 8v1"}],["rect",{width:"20",height:"12",x:"2",y:"9",rx:"2"}],["circle",{cx:"8",cy:"15",r:"2"}],["circle",{cx:"16",cy:"15",r:"2"}]]];var yi=["svg",t,[["path",{d:"M12 8V4H8"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2"}],["path",{d:"M2 14h2"}],["path",{d:"M20 14h2"}],["path",{d:"M15 13v2"}],["path",{d:"M9 13v2"}]]];var Mi=["svg",t,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 3h1"}],["path",{d:"M14 21h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v1"}],["path",{d:"M3 14v1"}],["path",{d:"M21 14v1"}]]];var bi=["svg",t,[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"}],["path",{d:"m3.3 7 8.7 5 8.7-5"}],["path",{d:"M12 22V12"}]]];var Si=["svg",t,[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"}],["path",{d:"m7 16.5-4.74-2.85"}],["path",{d:"m7 16.5 5-3"}],["path",{d:"M7 16.5v5.17"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"}],["path",{d:"m17 16.5-5-3"}],["path",{d:"m17 16.5 4.74-2.85"}],["path",{d:"M17 16.5v5.17"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"}],["path",{d:"M12 8 7.26 5.15"}],["path",{d:"m12 8 4.74-2.85"}],["path",{d:"M12 13.5V8"}]]];var Qt=["svg",t,[["path",{d:"M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"}],["path",{d:"M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"}]]];var Ai=["svg",t,[["path",{d:"M16 3h3v18h-3"}],["path",{d:"M8 21H5V3h3"}]]];var wi=["svg",t,[["path",{d:"M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"}],["path",{d:"M16 8V5c0-1.1.9-2 2-2"}],["path",{d:"M12 13h4"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1"}],["path",{d:"M12 8h8"}],["path",{d:"M20.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"}],["path",{d:"M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"}],["path",{d:"M20.5 21a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"}],["path",{d:"M18.5 3a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"}]]];var Ci=["svg",t,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 19.5a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5"}],["path",{d:"m15.7 10.4-.9.4"}],["path",{d:"m9.2 13.2-.9.4"}],["path",{d:"m13.6 15.7-.4-.9"}],["path",{d:"m10.8 9.2-.4-.9"}],["path",{d:"m15.7 13.5-.9-.4"}],["path",{d:"m9.2 10.9-.9-.4"}],["path",{d:"m10.5 15.7.4-.9"}],["path",{d:"m13.1 9.2.4-.9"}]]];var Li=["svg",t,[["path",{d:"M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"}],["path",{d:"M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"}]]];var Ei=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 9v6"}],["path",{d:"M16 15v6"}],["path",{d:"M16 3v6"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["path",{d:"M8 15v6"}],["path",{d:"M8 3v6"}]]];var ki=["svg",t,[["rect",{width:"20",height:"14",x:"2",y:"7",rx:"2",ry:"2"}],["path",{d:"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}]]];var Pi=["svg",t,[["rect",{x:"8",y:"8",width:"8",height:"8",rx:"2"}],["path",{d:"M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"}],["path",{d:"M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"}]]];var Ti=["svg",t,[["path",{d:"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"}],["path",{d:"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"}]]];var Di=["svg",t,[["path",{d:"M15 7.13V6a3 3 0 0 0-5.14-2.1L8 2"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M22 13h-4v-2a4 4 0 0 0-4-4h-1.3"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"m2 2 20 20"}],["path",{d:"M7.7 7.7A4 4 0 0 0 6 11v3a6 6 0 0 0 11.13 3.13"}],["path",{d:"M12 20v-8"}],["path",{d:"M6 13H2"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}]]];var Hi=["svg",t,[["path",{d:"m8 2 1.88 1.88"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"}],["path",{d:"M18 11a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v3a6.1 6.1 0 0 0 2 4.5"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5"}],["path",{d:"M6 13H2"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"m12 12 8 5-8 5Z"}]]];var Fi=["svg",t,[["path",{d:"m8 2 1.88 1.88"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"}],["path",{d:"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"}],["path",{d:"M12 20v-9"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5"}],["path",{d:"M6 13H2"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"M22 13h-4"}],["path",{d:"M17.2 17c2.1.1 3.8 1.9 3.8 4"}]]];var Vi=["svg",t,[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"}],["path",{d:"M10 6h4"}],["path",{d:"M10 10h4"}],["path",{d:"M10 14h4"}],["path",{d:"M10 18h4"}]]];var Bi=["svg",t,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2"}],["path",{d:"M9 22v-4h6v4"}],["path",{d:"M8 6h.01"}],["path",{d:"M16 6h.01"}],["path",{d:"M12 6h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M16 10h.01"}],["path",{d:"M16 14h.01"}],["path",{d:"M8 10h.01"}],["path",{d:"M8 14h.01"}]]];var Ri=["svg",t,[["path",{d:"M4 6 2 7"}],["path",{d:"M10 6h4"}],["path",{d:"m22 7-2-1"}],["rect",{width:"16",height:"16",x:"4",y:"3",rx:"2"}],["path",{d:"M4 11h16"}],["path",{d:"M8 15h.01"}],["path",{d:"M16 15h.01"}],["path",{d:"M6 19v2"}],["path",{d:"M18 21v-2"}]]];var Ii=["svg",t,[["path",{d:"M8 6v6"}],["path",{d:"M15 6v6"}],["path",{d:"M2 12h19.6"}],["path",{d:"M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"}],["circle",{cx:"7",cy:"18",r:"2"}],["path",{d:"M9 18h5"}],["circle",{cx:"16",cy:"18",r:"2"}]]];var $i=["svg",t,[["path",{d:"M10 3h.01"}],["path",{d:"M14 2h.01"}],["path",{d:"m2 9 20-5"}],["path",{d:"M12 12V6.5"}],["rect",{width:"16",height:"10",x:"4",y:"12",rx:"3"}],["path",{d:"M9 12v5"}],["path",{d:"M15 12v5"}],["path",{d:"M4 17h16"}]]];var Oi=["svg",t,[["path",{d:"M4 9a2 2 0 0 1-2-2V5h6v2a2 2 0 0 1-2 2Z"}],["path",{d:"M3 5V3"}],["path",{d:"M7 5V3"}],["path",{d:"M19 15V6.5a3.5 3.5 0 0 0-7 0v11a3.5 3.5 0 0 1-7 0V9"}],["path",{d:"M17 21v-2"}],["path",{d:"M21 21v-2"}],["path",{d:"M22 19h-6v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2Z"}]]];var Ni=["svg",t,[["circle",{cx:"9",cy:"7",r:"2"}],["path",{d:"M7.2 7.9 3 11v9c0 .6.4 1 1 1h16c.6 0 1-.4 1-1v-9c0-2-3-6-7-8l-3.6 2.6"}],["path",{d:"M16 13H3"}],["path",{d:"M16 17H3"}]]];var qi=["svg",t,[["path",{d:"M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"}],["path",{d:"M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"}],["path",{d:"M2 21h20"}],["path",{d:"M7 8v3"}],["path",{d:"M12 8v3"}],["path",{d:"M17 8v3"}],["path",{d:"M7 4h0.01"}],["path",{d:"M12 4h0.01"}],["path",{d:"M17 4h0.01"}]]];var Wi=["svg",t,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18"}],["path",{d:"M16 10h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M8 10h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M8 14h.01"}],["path",{d:"M12 18h.01"}],["path",{d:"M8 18h.01"}]]];var Zi=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"m16 20 2 2 4-4"}]]];var Ui=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"m9 16 2 2 4-4"}]]];var Gi=["svg",t,[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"}],["path",{d:"M16 2v4"}],["path",{d:"M8 2v4"}],["path",{d:"M3 10h5"}],["path",{d:"M17.5 17.5 16 16.3V14"}],["circle",{cx:"16",cy:"16",r:"6"}]]];var _i=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M8 14h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M16 14h.01"}],["path",{d:"M8 18h.01"}],["path",{d:"M12 18h.01"}],["path",{d:"M16 18h.01"}]]];var zi=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 17V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11Z"}],["path",{d:"M3 10h18"}],["path",{d:"M15 22v-4a2 2 0 0 1 2-2h4"}]]];var ji=["svg",t,[["path",{d:"M3 10h18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"}],["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21.29 14.7a2.43 2.43 0 0 0-2.65-.52c-.3.12-.57.3-.8.53l-.34.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L17.5 22l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z"}]]];var Xi=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M10 16h4"}]]];var Ki=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"M16 19h6"}]]];var Yi=["svg",t,[["path",{d:"M4.2 4.2A2 2 0 0 0 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.82-1.18"}],["path",{d:"M21 15.5V6a2 2 0 0 0-2-2H9.5"}],["path",{d:"M16 2v4"}],["path",{d:"M3 10h7"}],["path",{d:"M21 10h-5.5"}],["path",{d:"m2 2 20 20"}]]];var Ji=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M10 16h4"}],["path",{d:"M12 14v4"}]]];var Qi=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"M16 19h6"}],["path",{d:"M19 16v6"}]]];var tn=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M16 2v4"}],["path",{d:"M3 10h18"}],["path",{d:"M8 2v4"}],["path",{d:"M17 14h-6"}],["path",{d:"M13 18H7"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 18h.01"}]]];var en=["svg",t,[["path",{d:"M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"}],["path",{d:"M16 2v4"}],["path",{d:"M8 2v4"}],["path",{d:"M3 10h18"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.5-1.5"}]]];var an=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"m17 22 5-5"}],["path",{d:"m17 17 5 5"}]]];var rn=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"m14 14-4 4"}],["path",{d:"m10 14 4 4"}]]];var on=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}]]];var sn=["svg",t,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"}],["path",{d:"M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"}],["path",{d:"M14.121 15.121A3 3 0 1 1 9.88 10.88"}]]];var nn=["svg",t,[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}],["circle",{cx:"12",cy:"13",r:"3"}]]];var ln=["svg",t,[["path",{d:"M9 5v4"}],["rect",{width:"4",height:"6",x:"7",y:"9",rx:"1"}],["path",{d:"M9 15v2"}],["path",{d:"M17 3v2"}],["rect",{width:"4",height:"8",x:"15",y:"5",rx:"1"}],["path",{d:"M17 13v3"}],["path",{d:"M3 3v18h18"}]]];var dn=["svg",t,[["path",{d:"M5.7 21a2 2 0 0 1-3.5-2l8.6-14a6 6 0 0 1 10.4 6 2 2 0 1 1-3.464-2 2 2 0 1 0-3.464-2Z"}],["path",{d:"M17.75 7 15 2.1"}],["path",{d:"M10.9 4.8 13 9"}],["path",{d:"m7.9 9.7 2 4.4"}],["path",{d:"M4.9 14.7 7 18.9"}]]];var cn=["svg",t,[["path",{d:"m8.5 8.5-1 1a4.95 4.95 0 0 0 7 7l1-1"}],["path",{d:"M11.843 6.187A4.947 4.947 0 0 1 16.5 7.5a4.947 4.947 0 0 1 1.313 4.657"}],["path",{d:"M14 16.5V14"}],["path",{d:"M14 6.5v1.843"}],["path",{d:"M10 10v7.5"}],["path",{d:"m16 7 1-5 1.367.683A3 3 0 0 0 19.708 3H21v1.292a3 3 0 0 0 .317 1.341L22 7l-5 1"}],["path",{d:"m8 17-1 5-1.367-.683A3 3 0 0 0 4.292 21H3v-1.292a3 3 0 0 0-.317-1.341L2 17l5-1"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var pn=["svg",t,[["path",{d:"m9.5 7.5-2 2a4.95 4.95 0 1 0 7 7l2-2a4.95 4.95 0 1 0-7-7Z"}],["path",{d:"M14 6.5v10"}],["path",{d:"M10 7.5v10"}],["path",{d:"m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3c0 .46.1.92.32 1.33L22 7l-5 1"}],["path",{d:"m8 17-1 5-1.37-.68A3 3 0 0 0 4.3 21H3v-1.3a3 3 0 0 0-.32-1.33L2 17l5-1"}]]];var fn=["svg",t,[["path",{d:"M10.5 5H19a2 2 0 0 1 2 2v8.5"}],["path",{d:"M17 11h-.5"}],["path",{d:"M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"}],["path",{d:"m2 2 20 20"}],["path",{d:"M7 11h4"}],["path",{d:"M7 15h2.5"}]]];var te=["svg",t,[["rect",{width:"18",height:"14",x:"3",y:"5",rx:"2",ry:"2"}],["path",{d:"M7 15h4M15 15h2M7 11h2M13 11h4"}]]];var hn=["svg",t,[["path",{d:"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 14h.01"}],["rect",{width:"18",height:"8",x:"3",y:"10",rx:"2"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];var un=["svg",t,[["path",{d:"M10 2h4"}],["path",{d:"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 14h.01"}],["rect",{width:"18",height:"8",x:"3",y:"10",rx:"2"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];var mn=["svg",t,[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],["circle",{cx:"7",cy:"17",r:"2"}],["path",{d:"M9 17h6"}],["circle",{cx:"17",cy:"17",r:"2"}]]];var xn=["svg",t,[["rect",{width:"4",height:"4",x:"2",y:"9"}],["rect",{width:"4",height:"10",x:"10",y:"9"}],["path",{d:"M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2"}],["circle",{cx:"8",cy:"19",r:"2"}],["path",{d:"M10 19h12v-2"}]]];var gn=["svg",t,[["path",{d:"M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"}],["path",{d:"M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"}],["path",{d:"M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"}]]];var vn=["svg",t,[["circle",{cx:"7",cy:"12",r:"3"}],["path",{d:"M10 9v6"}],["circle",{cx:"17",cy:"12",r:"3"}],["path",{d:"M14 7v8"}]]];var yn=["svg",t,[["path",{d:"m3 15 4-8 4 8"}],["path",{d:"M4 13h6"}],["circle",{cx:"18",cy:"12",r:"3"}],["path",{d:"M21 9v6"}]]];var Mn=["svg",t,[["path",{d:"m3 15 4-8 4 8"}],["path",{d:"M4 13h6"}],["path",{d:"M15 11h4.5a2 2 0 0 1 0 4H15V7h4a2 2 0 0 1 0 4"}]]];var bn=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["circle",{cx:"8",cy:"10",r:"2"}],["path",{d:"M8 12h8"}],["circle",{cx:"16",cy:"10",r:"2"}],["path",{d:"m6 20 .7-2.9A1.4 1.4 0 0 1 8.1 16h7.8a1.4 1.4 0 0 1 1.4 1l.7 3"}]]];var Sn=["svg",t,[["path",{d:"M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"}],["path",{d:"M2 12a9 9 0 0 1 8 8"}],["path",{d:"M2 16a5 5 0 0 1 4 4"}],["line",{x1:"2",x2:"2.01",y1:"20",y2:"20"}]]];var An=["svg",t,[["path",{d:"M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"}],["path",{d:"M18 11V4H6v7"}],["path",{d:"M15 22v-4a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4"}],["path",{d:"M22 11V9"}],["path",{d:"M2 11V9"}],["path",{d:"M6 4V2"}],["path",{d:"M18 4V2"}],["path",{d:"M10 4V2"}],["path",{d:"M14 4V2"}]]];var wn=["svg",t,[["path",{d:"M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"}],["path",{d:"M8 14v.5"}],["path",{d:"M16 14v.5"}],["path",{d:"M11.25 16.25h1.5L12 17l-.75-.75Z"}]]];var Cn=["svg",t,[["path",{d:"M7 9h.01"}],["path",{d:"M16.75 12H22l-3.5 7-3.09-4.32"}],["path",{d:"M18 9.5l-4 8-10.39-5.2a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3Z"}],["path",{d:"M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"}],["path",{d:"M2 21v-4"}]]];var Ln=["svg",t,[["path",{d:"M18 6 7 17l-5-5"}],["path",{d:"m22 10-7.5 7.5L13 16"}]]];var En=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m9 12 2 2 4-4"}]]];var kn=["svg",t,[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}],["path",{d:"m9 11 3 3L22 4"}]]];var Pn=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m9 12 2 2 4-4"}]]];var Tn=["svg",t,[["path",{d:"m9 11 3 3L22 4"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"}]]];var Dn=["svg",t,[["path",{d:"M20 6 9 17l-5-5"}]]];var Hn=["svg",t,[["path",{d:"M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"}],["line",{x1:"6",x2:"18",y1:"17",y2:"17"}]]];var Fn=["svg",t,[["path",{d:"M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"}],["path",{d:"M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"}],["path",{d:"M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12"}],["path",{d:"M22 9c-4.29 0-7.14-2.33-10-7 5.71 0 10 4.67 10 7Z"}]]];var Vn=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m16 10-4 4-4-4"}]]];var Bn=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 10-4 4-4-4"}]]];var Rn=["svg",t,[["path",{d:"m6 9 6 6 6-6"}]]];var In=["svg",t,[["path",{d:"m17 18-6-6 6-6"}],["path",{d:"M7 6v12"}]]];var $n=["svg",t,[["path",{d:"m7 18 6-6-6-6"}],["path",{d:"M17 6v12"}]]];var On=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m14 16-4-4 4-4"}]]];var Nn=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m14 16-4-4 4-4"}]]];var qn=["svg",t,[["path",{d:"m15 18-6-6 6-6"}]]];var Wn=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m10 8 4 4-4 4"}]]];var Zn=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m10 8 4 4-4 4"}]]];var Un=["svg",t,[["path",{d:"m9 18 6-6-6-6"}]]];var Gn=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m8 14 4-4 4 4"}]]];var _n=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m8 14 4-4 4 4"}]]];var zn=["svg",t,[["path",{d:"m18 15-6-6-6 6"}]]];var jn=["svg",t,[["path",{d:"m7 20 5-5 5 5"}],["path",{d:"m7 4 5 5 5-5"}]]];var Xn=["svg",t,[["path",{d:"m7 6 5 5 5-5"}],["path",{d:"m7 13 5 5 5-5"}]]];var Kn=["svg",t,[["path",{d:"m9 7-5 5 5 5"}],["path",{d:"m15 7 5 5-5 5"}]]];var Yn=["svg",t,[["path",{d:"m11 17-5-5 5-5"}],["path",{d:"m18 17-5-5 5-5"}]]];var Jn=["svg",t,[["path",{d:"m20 17-5-5 5-5"}],["path",{d:"m4 17 5-5-5-5"}]]];var Qn=["svg",t,[["path",{d:"m6 17 5-5-5-5"}],["path",{d:"m13 17 5-5-5-5"}]]];var tl=["svg",t,[["path",{d:"m7 15 5 5 5-5"}],["path",{d:"m7 9 5-5 5 5"}]]];var el=["svg",t,[["path",{d:"m17 11-5-5-5 5"}],["path",{d:"m17 18-5-5-5 5"}]]];var al=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"4"}],["line",{x1:"21.17",x2:"12",y1:"8",y2:"8"}],["line",{x1:"3.95",x2:"8.54",y1:"6.06",y2:"14"}],["line",{x1:"10.88",x2:"15.46",y1:"21.94",y2:"14"}]]];var rl=["svg",t,[["path",{d:"m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"}],["path",{d:"M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"}],["path",{d:"M18 22V5l-6-3-6 3v17"}],["path",{d:"M12 7v5"}],["path",{d:"M10 9h4"}]]];var ol=["svg",t,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M12 12H2v4h14"}],["path",{d:"M22 12v4"}],["path",{d:"M18 12h-.5"}],["path",{d:"M7 12v4"}],["path",{d:"M18 8c0-2.5-2-2.5-2-5"}],["path",{d:"M22 8c0-2.5-2-2.5-2-5"}]]];var sl=["svg",t,[["path",{d:"M18 12H2v4h16"}],["path",{d:"M22 12v4"}],["path",{d:"M7 12v4"}],["path",{d:"M18 8c0-2.5-2-2.5-2-5"}],["path",{d:"M22 8c0-2.5-2-2.5-2-5"}]]];var il=["svg",t,[["path",{d:"M10.1 2.182a10 10 0 0 1 3.8 0"}],["path",{d:"M13.9 21.818a10 10 0 0 1-3.8 0"}],["path",{d:"M17.609 3.721a10 10 0 0 1 2.69 2.7"}],["path",{d:"M2.182 13.9a10 10 0 0 1 0-3.8"}],["path",{d:"M20.279 17.609a10 10 0 0 1-2.7 2.69"}],["path",{d:"M21.818 10.1a10 10 0 0 1 0 3.8"}],["path",{d:"M3.721 6.391a10 10 0 0 1 2.7-2.69"}],["path",{d:"M6.391 20.279a10 10 0 0 1-2.69-2.7"}]]];var nl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 18V6"}]]];var ll=["svg",t,[["path",{d:"M10.1 2.18a9.93 9.93 0 0 1 3.8 0"}],["path",{d:"M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7"}],["path",{d:"M21.82 10.1a9.93 9.93 0 0 1 0 3.8"}],["path",{d:"M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69"}],["path",{d:"M13.9 21.82a9.94 9.94 0 0 1-3.8 0"}],["path",{d:"M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7"}],["path",{d:"M2.18 13.9a9.93 9.93 0 0 1 0-3.8"}],["path",{d:"M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69"}],["circle",{cx:"12",cy:"12",r:"1"}]]];var dl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"1"}]]];var cl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M17 12h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M7 12h.01"}]]];var pl=["svg",t,[["path",{d:"M7 10h10"}],["path",{d:"M7 14h10"}],["circle",{cx:"12",cy:"12",r:"10"}]]];var fl=["svg",t,[["path",{d:"M12 2a10 10 0 0 1 7.38 16.75"}],["path",{d:"M12 8v8"}],["path",{d:"M16 12H8"}],["path",{d:"M2.5 8.875a10 10 0 0 0-.5 3"}],["path",{d:"M2.83 16a10 10 0 0 0 2.43 3.4"}],["path",{d:"M4.636 5.235a10 10 0 0 1 .891-.857"}],["path",{d:"M8.644 21.42a10 10 0 0 0 7.631-.38"}]]];var hl=["svg",t,[["path",{d:"m2 2 20 20"}],["path",{d:"M8.35 2.69A10 10 0 0 1 21.3 15.65"}],["path",{d:"M19.08 19.08A10 10 0 1 1 4.92 4.92"}]]];var ee=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M22 2 2 22"}]]];var ul=["svg",t,[["line",{x1:"9",x2:"15",y1:"15",y2:"9"}],["circle",{cx:"12",cy:"12",r:"10"}]]];var ae=["svg",t,[["path",{d:"M18 20a6 6 0 0 0-12 0"}],["circle",{cx:"12",cy:"10",r:"4"}],["circle",{cx:"12",cy:"12",r:"10"}]]];var re=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"}]]];var ml=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}]]];var xl=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M11 9h4a2 2 0 0 0 2-2V3"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"M7 21v-4a2 2 0 0 1 2-2h4"}],["circle",{cx:"15",cy:"15",r:"2"}]]];var gl=["svg",t,[["path",{d:"M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z"}],["path",{d:"M19.65 15.66A8 8 0 0 1 8.35 4.34"}],["path",{d:"m14 10-5.5 5.5"}],["path",{d:"M14 17.85V10H6.15"}]]];var vl=["svg",t,[["path",{d:"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"}],["path",{d:"m6.2 5.3 3.1 3.9"}],["path",{d:"m12.4 3.4 3.1 4"}],["path",{d:"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"}]]];var yl=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m9 14 2 2 4-4"}]]];var Ml=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v4"}],["path",{d:"M21 14H11"}],["path",{d:"m15 10-4 4 4 4"}]]];var bl=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M12 11h4"}],["path",{d:"M12 16h4"}],["path",{d:"M8 11h.01"}],["path",{d:"M8 16h.01"}]]];var Sl=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 14h6"}]]];var Al=["svg",t,[["path",{d:"M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10"}],["path",{d:"m17 10 4 4-4 4"}]]];var oe=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5"}],["path",{d:"M16 4h2a2 2 0 0 1 1.73 1"}],["path",{d:"M8 18h1"}],["path",{d:"M18.4 9.6a2 2 0 0 1 3 3L17 17l-4 1 1-4Z"}]]];var se=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1"}],["path",{d:"M10.4 12.6a2 2 0 0 1 3 3L8 21l-4 1 1-4Z"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5"}],["path",{d:"M4 13.5V6a2 2 0 0 1 2-2h2"}]]];var wl=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 14h6"}],["path",{d:"M12 17v-6"}]]];var Cl=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 12v-1h6v1"}],["path",{d:"M11 17h2"}],["path",{d:"M12 11v6"}]]];var Ll=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m15 11-6 6"}],["path",{d:"m9 11 6 6"}]]];var El=["svg",t,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}]]];var kl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 14.5 8"}]]];var Pl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 8 10"}]]];var Tl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 9.5 8"}]]];var Dl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12"}]]];var Hl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 10"}]]];var Fl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16.5 12"}]]];var Vl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 14"}]]];var Bl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 14.5 16"}]]];var Rl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 12 16.5"}]]];var Il=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 9.5 16"}]]];var $l=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 8 14"}]]];var Ol=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 7.5 12"}]]];var Nl=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 14"}]]];var ql=["svg",t,[["circle",{cx:"12",cy:"17",r:"3"}],["path",{d:"M4.2 15.1A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2"}],["path",{d:"m15.7 18.4-.9-.3"}],["path",{d:"m9.2 15.9-.9-.3"}],["path",{d:"m10.6 20.7.3-.9"}],["path",{d:"m13.1 14.2.3-.9"}],["path",{d:"m13.6 20.7-.4-1"}],["path",{d:"m10.8 14.3-.4-1"}],["path",{d:"m8.3 18.6 1-.4"}],["path",{d:"m14.7 15.8 1-.4"}]]];var Wl=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M8 19v1"}],["path",{d:"M8 14v1"}],["path",{d:"M16 19v1"}],["path",{d:"M16 14v1"}],["path",{d:"M12 21v1"}],["path",{d:"M12 16v1"}]]];var Zl=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 17H7"}],["path",{d:"M17 21H9"}]]];var Ul=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 14v2"}],["path",{d:"M8 14v2"}],["path",{d:"M16 20h.01"}],["path",{d:"M8 20h.01"}],["path",{d:"M12 16v2"}],["path",{d:"M12 22h.01"}]]];var Gl=["svg",t,[["path",{d:"M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"}],["path",{d:"m13 12-3 5h4l-3 5"}]]];var _l=["svg",t,[["path",{d:"M10.083 9A6.002 6.002 0 0 1 16 4a4.243 4.243 0 0 0 6 6c0 2.22-1.206 4.16-3 5.197"}],["path",{d:"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"}],["path",{d:"M11 20v2"}],["path",{d:"M7 19v2"}]]];var zl=["svg",t,[["path",{d:"M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"}],["path",{d:"M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197"}]]];var jl=["svg",t,[["path",{d:"m2 2 20 20"}],["path",{d:"M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"}],["path",{d:"M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"}]]];var Xl=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"m9.2 22 3-7"}],["path",{d:"m9 13-3 7"}],["path",{d:"m17 13-3 7"}]]];var Kl=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 14v6"}],["path",{d:"M8 14v6"}],["path",{d:"M12 16v6"}]]];var Yl=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M8 15h.01"}],["path",{d:"M8 19h.01"}],["path",{d:"M12 17h.01"}],["path",{d:"M12 21h.01"}],["path",{d:"M16 15h.01"}],["path",{d:"M16 19h.01"}]]];var Jl=["svg",t,[["path",{d:"M12 2v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"M20 12h2"}],["path",{d:"m19.07 4.93-1.41 1.41"}],["path",{d:"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{d:"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"}],["path",{d:"M11 20v2"}],["path",{d:"M7 19v2"}]]];var Ql=["svg",t,[["path",{d:"M12 2v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"M20 12h2"}],["path",{d:"m19.07 4.93-1.41 1.41"}],["path",{d:"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{d:"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"}]]];var td=["svg",t,[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"}]]];var ed=["svg",t,[["path",{d:"M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"}],["path",{d:"M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5"}]]];var ad=["svg",t,[["path",{d:"M16.17 7.83 2 22"}],["path",{d:"M4.02 12a2.827 2.827 0 1 1 3.81-4.17A2.827 2.827 0 1 1 12 4.02a2.827 2.827 0 1 1 4.17 3.81A2.827 2.827 0 1 1 19.98 12a2.827 2.827 0 1 1-3.81 4.17A2.827 2.827 0 1 1 12 19.98a2.827 2.827 0 1 1-4.17-3.81A1 1 0 1 1 4 12"}],["path",{d:"m7.83 7.83 8.34 8.34"}]]];var rd=["svg",t,[["path",{d:"M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z"}],["path",{d:"M12 17.66L12 22"}]]];var od=["svg",t,[["path",{d:"m18 16 4-4-4-4"}],["path",{d:"m6 8-4 4 4 4"}],["path",{d:"m14.5 4-5 16"}]]];var ie=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m10 10-2 2 2 2"}],["path",{d:"m14 14 2-2-2-2"}]]];var sd=["svg",t,[["polyline",{points:"16 18 22 12 16 6"}],["polyline",{points:"8 6 2 12 8 18"}]]];var id=["svg",t,[["polygon",{points:"12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"}],["line",{x1:"12",x2:"12",y1:"22",y2:"15.5"}],["polyline",{points:"22 8.5 12 15.5 2 8.5"}],["polyline",{points:"2 15.5 12 8.5 22 15.5"}],["line",{x1:"12",x2:"12",y1:"2",y2:"8.5"}]]];var nd=["svg",t,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}],["polyline",{points:"7.5 4.21 12 6.81 16.5 4.21"}],["polyline",{points:"7.5 19.79 7.5 14.6 3 12"}],["polyline",{points:"21 12 16.5 14.6 16.5 19.79"}],["polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}],["line",{x1:"12",x2:"12",y1:"22.08",y2:"12"}]]];var ld=["svg",t,[["path",{d:"M17 8h1a4 4 0 1 1 0 8h-1"}],["path",{d:"M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"}],["line",{x1:"6",x2:"6",y1:"2",y2:"4"}],["line",{x1:"10",x2:"10",y1:"2",y2:"4"}],["line",{x1:"14",x2:"14",y1:"2",y2:"4"}]]];var dd=["svg",t,[["path",{d:"M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"}],["path",{d:"M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"}],["path",{d:"M12 2v2"}],["path",{d:"M12 22v-2"}],["path",{d:"m17 20.66-1-1.73"}],["path",{d:"M11 10.27 7 3.34"}],["path",{d:"m20.66 17-1.73-1"}],["path",{d:"m3.34 7 1.73 1"}],["path",{d:"M14 12h8"}],["path",{d:"M2 12h2"}],["path",{d:"m20.66 7-1.73 1"}],["path",{d:"m3.34 17 1.73-1"}],["path",{d:"m17 3.34-1 1.73"}],["path",{d:"m11 13.73-4 6.93"}]]];var cd=["svg",t,[["circle",{cx:"8",cy:"8",r:"6"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18"}],["path",{d:"M7 6h1v4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82"}]]];var ne=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 3v18"}]]];var le=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]]];var pd=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7.5 3v18"}],["path",{d:"M12 3v18"}],["path",{d:"M16.5 3v18"}]]];var fd=["svg",t,[["rect",{width:"8",height:"8",x:"2",y:"2",rx:"2"}],["path",{d:"M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M10 18H5c-1.7 0-3-1.3-3-3v-1"}],["polyline",{points:"7 21 10 18 7 15"}],["rect",{width:"8",height:"8",x:"14",y:"14",rx:"2"}]]];var hd=["svg",t,[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"}]]];var ud=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polygon",{points:"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"}]]];var md=["svg",t,[["path",{d:"M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"}],["path",{d:"m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"}],["path",{d:"M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"}],["path",{d:"m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"}]]];var xd=["svg",t,[["rect",{width:"14",height:"8",x:"5",y:"2",rx:"2"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h2"}],["path",{d:"M12 18h6"}]]];var gd=["svg",t,[["path",{d:"M2 18a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2H2v-2Z"}],["path",{d:"M20 16a8 8 0 1 0-16 0"}],["path",{d:"M12 4v4"}],["path",{d:"M10 4h4"}]]];var vd=["svg",t,[["path",{d:"m20.9 18.55-8-15.98a1 1 0 0 0-1.8 0l-8 15.98"}],["ellipse",{cx:"12",cy:"19",rx:"9",ry:"3"}]]];var yd=["svg",t,[["rect",{x:"2",y:"6",width:"20",height:"8",rx:"1"}],["path",{d:"M17 14v7"}],["path",{d:"M7 14v7"}],["path",{d:"M17 3v3"}],["path",{d:"M7 3v3"}],["path",{d:"M10 14 2.3 6.3"}],["path",{d:"m14 6 7.7 7.7"}],["path",{d:"m8 6 8 8"}]]];var Md=["svg",t,[["path",{d:"M16 18a4 4 0 0 0-8 0"}],["circle",{cx:"12",cy:"11",r:"3"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["line",{x1:"8",x2:"8",y1:"2",y2:"4"}],["line",{x1:"16",x2:"16",y1:"2",y2:"4"}]]];var bd=["svg",t,[["path",{d:"M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["circle",{cx:"12",cy:"10",r:"2"}],["line",{x1:"8",x2:"8",y1:"2",y2:"4"}],["line",{x1:"16",x2:"16",y1:"2",y2:"4"}]]];var Sd=["svg",t,[["path",{d:"M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"}],["path",{d:"M10 21.9V14L2.1 9.1"}],["path",{d:"m10 14 11.9-6.9"}],["path",{d:"M14 19.8v-8.1"}],["path",{d:"M18 17.5V9.4"}]]];var Ad=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 18a6 6 0 0 0 0-12v12z"}]]];var wd=["svg",t,[["path",{d:"M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"}],["path",{d:"M8.5 8.5v.01"}],["path",{d:"M16 15.5v.01"}],["path",{d:"M12 12v.01"}],["path",{d:"M11 17v.01"}],["path",{d:"M7 14v.01"}]]];var Cd=["svg",t,[["path",{d:"M2 12h20"}],["path",{d:"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{d:"m4 8 16-4"}],["path",{d:"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"}]]];var Ld=["svg",t,[["path",{d:"m12 15 2 2 4-4"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var Ed=["svg",t,[["line",{x1:"12",x2:"18",y1:"15",y2:"15"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var kd=["svg",t,[["line",{x1:"15",x2:"15",y1:"12",y2:"18"}],["line",{x1:"12",x2:"18",y1:"15",y2:"15"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var Pd=["svg",t,[["line",{x1:"12",x2:"18",y1:"18",y2:"12"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var Td=["svg",t,[["line",{x1:"12",x2:"18",y1:"12",y2:"18"}],["line",{x1:"12",x2:"18",y1:"18",y2:"12"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var Dd=["svg",t,[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];var Hd=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9.17 14.83a4 4 0 1 0 0-5.66"}]]];var Fd=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M14.83 14.83a4 4 0 1 1 0-5.66"}]]];var Vd=["svg",t,[["polyline",{points:"9 10 4 15 9 20"}],["path",{d:"M20 4v7a4 4 0 0 1-4 4H4"}]]];var Bd=["svg",t,[["polyline",{points:"15 10 20 15 15 20"}],["path",{d:"M4 4v7a4 4 0 0 0 4 4h12"}]]];var Rd=["svg",t,[["polyline",{points:"14 15 9 20 4 15"}],["path",{d:"M20 4h-7a4 4 0 0 0-4 4v12"}]]];var Id=["svg",t,[["polyline",{points:"14 9 9 4 4 9"}],["path",{d:"M20 20h-7a4 4 0 0 1-4-4V4"}]]];var $d=["svg",t,[["polyline",{points:"10 15 15 20 20 15"}],["path",{d:"M4 4h7a4 4 0 0 1 4 4v12"}]]];var Od=["svg",t,[["polyline",{points:"10 9 15 4 20 9"}],["path",{d:"M4 20h7a4 4 0 0 0 4-4V4"}]]];var Nd=["svg",t,[["polyline",{points:"9 14 4 9 9 4"}],["path",{d:"M20 20v-7a4 4 0 0 0-4-4H4"}]]];var qd=["svg",t,[["polyline",{points:"15 14 20 9 15 4"}],["path",{d:"M4 20v-7a4 4 0 0 1 4-4h12"}]]];var Wd=["svg",t,[["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2"}],["rect",{x:"9",y:"9",width:"6",height:"6"}],["path",{d:"M15 2v2"}],["path",{d:"M15 20v2"}],["path",{d:"M2 15h2"}],["path",{d:"M2 9h2"}],["path",{d:"M20 15h2"}],["path",{d:"M20 9h2"}],["path",{d:"M9 2v2"}],["path",{d:"M9 20v2"}]]];var Zd=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M10 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1"}],["path",{d:"M17 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1"}]]];var Ud=["svg",t,[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10"}]]];var Gd=["svg",t,[["path",{d:"m4.6 13.11 5.79-3.21c1.89-1.05 4.79 1.78 3.71 3.71l-3.22 5.81C8.8 23.16.79 15.23 4.6 13.11Z"}],["path",{d:"m10.5 9.5-1-2.29C9.2 6.48 8.8 6 8 6H4.5C2.79 6 2 6.5 2 8.5a7.71 7.71 0 0 0 2 4.83"}],["path",{d:"M8 6c0-1.55.24-4-2-4-2 0-2.5 2.17-2.5 4"}],["path",{d:"m14.5 13.5 2.29 1c.73.3 1.21.7 1.21 1.5v3.5c0 1.71-.5 2.5-2.5 2.5a7.71 7.71 0 0 1-4.83-2"}],["path",{d:"M18 16c1.55 0 4-.24 4 2 0 2-2.17 2.5-4 2.5"}]]];var _d=["svg",t,[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2"}]]];var zd=["svg",t,[["path",{d:"M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"}]]];var jd=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18"}]]];var Xd=["svg",t,[["path",{d:"m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"}]]];var Kd=["svg",t,[["path",{d:"m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.95 8.41a2 2 0 0 0-.95 1.7v5.82a2 2 0 0 0 .88 1.66l6.05 4.07a2 2 0 0 0 2.17.05l9.95-6.12a2 2 0 0 0 .95-1.7V8.06a2 2 0 0 0-.88-1.66Z"}],["path",{d:"M10 22v-8L2.25 9.15"}],["path",{d:"m10 14 11.77-6.87"}]]];var Yd=["svg",t,[["path",{d:"m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"}],["path",{d:"M5 8h14"}],["path",{d:"M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"}],["path",{d:"m12 8 1-6h2"}]]];var Jd=["svg",t,[["circle",{cx:"12",cy:"12",r:"8"}],["line",{x1:"3",x2:"6",y1:"3",y2:"6"}],["line",{x1:"21",x2:"18",y1:"3",y2:"6"}],["line",{x1:"3",x2:"6",y1:"21",y2:"18"}],["line",{x1:"21",x2:"18",y1:"21",y2:"18"}]]];var Qd=["svg",t,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5v14a9 3 0 0 0 18 0V5"}]]];var tc=["svg",t,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 12a9 3 0 0 0 5 2.69"}],["path",{d:"M21 9.3V5"}],["path",{d:"M3 5v14a9 3 0 0 0 6.47 2.88"}],["path",{d:"M12 12v4h4"}],["path",{d:"M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"}]]];var ec=["svg",t,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5V19A9 3 0 0 0 15 21.84"}],["path",{d:"M21 5V8"}],["path",{d:"M21 12L18 17H22L19 22"}],["path",{d:"M3 12A9 3 0 0 0 14.59 14.87"}]]];var ac=["svg",t,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5"}],["path",{d:"M3 12A9 3 0 0 0 21 12"}]]];var rc=["svg",t,[["path",{d:"M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"}],["line",{x1:"18",x2:"12",y1:"9",y2:"15"}],["line",{x1:"12",x2:"18",y1:"9",y2:"15"}]]];var oc=["svg",t,[["circle",{cx:"12",cy:"4",r:"2"}],["path",{d:"M10.2 3.2C5.5 4 2 8.1 2 13a2 2 0 0 0 4 0v-1a2 2 0 0 1 4 0v4a2 2 0 0 0 4 0v-4a2 2 0 0 1 4 0v1a2 2 0 0 0 4 0c0-4.9-3.5-9-8.2-9.8"}],["path",{d:"M3.2 14.8a9 9 0 0 0 17.6 0"}]]];var sc=["svg",t,[["circle",{cx:"19",cy:"19",r:"2"}],["circle",{cx:"5",cy:"5",r:"2"}],["path",{d:"M6.48 3.66a10 10 0 0 1 13.86 13.86"}],["path",{d:"m6.41 6.41 11.18 11.18"}],["path",{d:"M3.66 6.48a10 10 0 0 0 13.86 13.86"}]]];var ic=["svg",t,[["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"}]]];var nc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M12 12h.01"}]]];var lc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M15 9h.01"}],["path",{d:"M9 15h.01"}]]];var dc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M8 16h.01"}]]];var cc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 16h.01"}],["path",{d:"M16 16h.01"}]]];var pc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 16h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"M12 12h.01"}]]];var fc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M16 12h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 12h.01"}],["path",{d:"M8 16h.01"}]]];var hc=["svg",t,[["rect",{width:"12",height:"12",x:"2",y:"10",rx:"2",ry:"2"}],["path",{d:"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 14h.01"}],["path",{d:"M15 6h.01"}],["path",{d:"M18 9h.01"}]]];var uc=["svg",t,[["path",{d:"M12 3v14"}],["path",{d:"M5 10h14"}],["path",{d:"M5 21h14"}]]];var mc=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 12h.01"}]]];var xc=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M6 12c0-1.7.7-3.2 1.8-4.2"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M18 12c0 1.7-.7 3.2-1.8 4.2"}]]];var gc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"12",r:"5"}],["path",{d:"M12 12h.01"}]]];var vc=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"2"}]]];var yc=["svg",t,[["line",{x1:"8",x2:"16",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"16",y2:"16"}],["line",{x1:"12",x2:"12",y1:"8",y2:"8"}],["circle",{cx:"12",cy:"12",r:"10"}]]];var Mc=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"16",y2:"16"}],["line",{x1:"12",x2:"12",y1:"8",y2:"8"}]]];var bc=["svg",t,[["circle",{cx:"12",cy:"6",r:"1"}],["line",{x1:"5",x2:"19",y1:"12",y2:"12"}],["circle",{cx:"12",cy:"18",r:"1"}]]];var Sc=["svg",t,[["path",{d:"M15 2c-1.35 1.5-2.092 3-2.5 4.5M9 22c1.35-1.5 2.092-3 2.5-4.5"}],["path",{d:"M2 15c3.333-3 6.667-3 10-3m10-3c-1.5 1.35-3 2.092-4.5 2.5"}],["path",{d:"m17 6-2.5-2.5"}],["path",{d:"m14 8-1.5-1.5"}],["path",{d:"m7 18 2.5 2.5"}],["path",{d:"m3.5 14.5.5.5"}],["path",{d:"m20 9 .5.5"}],["path",{d:"m6.5 12.5 1 1"}],["path",{d:"m16.5 10.5 1 1"}],["path",{d:"m10 16 1.5 1.5"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Ac=["svg",t,[["path",{d:"M2 15c6.667-6 13.333 0 20-6"}],["path",{d:"M9 22c1.798-1.998 2.518-3.995 2.807-5.993"}],["path",{d:"M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"}],["path",{d:"m17 6-2.5-2.5"}],["path",{d:"m14 8-1-1"}],["path",{d:"m7 18 2.5 2.5"}],["path",{d:"m3.5 14.5.5.5"}],["path",{d:"m20 9 .5.5"}],["path",{d:"m6.5 12.5 1 1"}],["path",{d:"m16.5 10.5 1 1"}],["path",{d:"m10 16 1.5 1.5"}]]];var wc=["svg",t,[["path",{d:"M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"}],["path",{d:"M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"}],["path",{d:"M8 14v.5"}],["path",{d:"M16 14v.5"}],["path",{d:"M11.25 16.25h1.5L12 17l-.75-.75Z"}],["path",{d:"M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"}]]];var Cc=["svg",t,[["line",{x1:"12",x2:"12",y1:"2",y2:"22"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"}]]];var Lc=["svg",t,[["path",{d:"M20.5 10a2.5 2.5 0 0 1-2.4-3H18a2.95 2.95 0 0 1-2.6-4.4 10 10 0 1 0 6.3 7.1c-.3.2-.8.3-1.2.3"}],["circle",{cx:"12",cy:"12",r:"3"}]]];var Ec=["svg",t,[["path",{d:"M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"}],["path",{d:"M2 20h20"}],["path",{d:"M14 12v.01"}]]];var kc=["svg",t,[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14"}],["path",{d:"M2 20h3"}],["path",{d:"M13 20h9"}],["path",{d:"M10 12v.01"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"}]]];var de=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"12",r:"1"}]]];var Pc=["svg",t,[["circle",{cx:"12.1",cy:"12.1",r:"1"}]]];var Tc=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M12 12v9"}],["path",{d:"m8 17 4 4 4-4"}]]];var Dc=["svg",t,[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{points:"7 10 12 15 17 10"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3"}]]];var Hc=["svg",t,[["circle",{cx:"12",cy:"5",r:"2"}],["path",{d:"m3 21 8.02-14.26"}],["path",{d:"m12.99 6.74 1.93 3.44"}],["path",{d:"M19 12c-3.87 4-10.13 4-14 0"}],["path",{d:"m21 21-2.16-3.84"}]]];var Fc=["svg",t,[["path",{d:"M10 11h.01"}],["path",{d:"M14 6h.01"}],["path",{d:"M18 6h.01"}],["path",{d:"M6.5 13.1h.01"}],["path",{d:"M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3"}],["path",{d:"M17.4 9.9c-.8.8-2 .8-2.8 0"}],["path",{d:"M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"}],["path",{d:"M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4"}]]];var Vc=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94"}],["path",{d:"M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32"}],["path",{d:"M8.56 2.75c4.37 6 6 9.42 8 17.72"}]]];var Bc=["svg",t,[["path",{d:"M14 9c0 .6-.4 1-1 1H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9c.6 0 1 .4 1 1Z"}],["path",{d:"M18 6h4"}],["path",{d:"M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3"}],["path",{d:"m5 10-2 8"}],["path",{d:"M12 10v3c0 .6-.4 1-1 1H8"}],["path",{d:"m7 18 2-8"}],["path",{d:"M5 22c-1.7 0-3-1.3-3-3 0-.6.4-1 1-1h7c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1Z"}]]];var Rc=["svg",t,[["path",{d:"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"}]]];var Ic=["svg",t,[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"}]]];var $c=["svg",t,[["path",{d:"m2 2 8 8"}],["path",{d:"m22 2-8 8"}],["ellipse",{cx:"12",cy:"9",rx:"10",ry:"5"}],["path",{d:"M7 13.4v7.9"}],["path",{d:"M12 14v8"}],["path",{d:"M17 13.4v7.9"}],["path",{d:"M2 9v8a10 5 0 0 0 20 0V9"}]]];var Oc=["svg",t,[["path",{d:"M15.45 15.4c-2.13.65-4.3.32-5.7-1.1-2.29-2.27-1.76-6.5 1.17-9.42 2.93-2.93 7.15-3.46 9.43-1.18 1.41 1.41 1.74 3.57 1.1 5.71-1.4-.51-3.26-.02-4.64 1.36-1.38 1.38-1.87 3.23-1.36 4.63z"}],["path",{d:"m11.25 15.6-2.16 2.16a2.5 2.5 0 1 1-4.56 1.73 2.49 2.49 0 0 1-1.41-4.24 2.5 2.5 0 0 1 3.14-.32l2.16-2.16"}]]];var Nc=["svg",t,[["path",{d:"m6.5 6.5 11 11"}],["path",{d:"m21 21-1-1"}],["path",{d:"m3 3 1 1"}],["path",{d:"m18 22 4-4"}],["path",{d:"m2 6 4-4"}],["path",{d:"m3 10 7-7"}],["path",{d:"m14 21 7-7"}]]];var qc=["svg",t,[["path",{d:"M6 18.5a3.5 3.5 0 1 0 7 0c0-1.57.92-2.52 2.04-3.46"}],["path",{d:"M6 8.5c0-.75.13-1.47.36-2.14"}],["path",{d:"M8.8 3.15A6.5 6.5 0 0 1 19 8.5c0 1.63-.44 2.81-1.09 3.76"}],["path",{d:"M12.5 6A2.5 2.5 0 0 1 15 8.5M10 13a2 2 0 0 0 1.82-1.18"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Wc=["svg",t,[["path",{d:"M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"}],["path",{d:"M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"}]]];var Zc=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a7 7 0 1 0 10 10"}]]];var Uc=["svg",t,[["circle",{cx:"11.5",cy:"12.5",r:"3.5"}],["path",{d:"M3 8c0-3.5 2.5-6 6.5-6 5 0 4.83 3 7.5 5s5 2 5 6c0 4.5-2.5 6.5-7 6.5-2.5 0-2.5 2.5-6 2.5s-7-2-7-5.5c0-3 1.5-3 1.5-5C3.5 10 3 9 3 8Z"}]]];var Gc=["svg",t,[["path",{d:"M6.399 6.399C5.362 8.157 4.65 10.189 4.5 12c-.37 4.43 1.27 9.95 7.5 10 3.256-.026 5.259-1.547 6.375-3.625"}],["path",{d:"M19.532 13.875A14.07 14.07 0 0 0 19.5 12c-.36-4.34-3.95-9.96-7.5-10-1.04.012-2.082.502-3.046 1.297"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var _c=["svg",t,[["path",{d:"M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z"}]]];var zc=["svg",t,[["line",{x1:"5",x2:"19",y1:"9",y2:"9"}],["line",{x1:"5",x2:"19",y1:"15",y2:"15"}],["line",{x1:"19",x2:"5",y1:"5",y2:"19"}]]];var ce=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 10h10"}],["path",{d:"M7 14h10"}]]];var jc=["svg",t,[["line",{x1:"5",x2:"19",y1:"9",y2:"9"}],["line",{x1:"5",x2:"19",y1:"15",y2:"15"}]]];var Xc=["svg",t,[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"}],["path",{d:"M22 21H7"}],["path",{d:"m5 11 9 9"}]]];var Kc=["svg",t,[["path",{d:"M4 10h12"}],["path",{d:"M4 14h9"}],["path",{d:"M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"}]]];var Yc=["svg",t,[["path",{d:"m21 21-6-6m6 6v-4.8m0 4.8h-4.8"}],["path",{d:"M3 16.2V21m0 0h4.8M3 21l6-6"}],["path",{d:"M21 7.8V3m0 0h-4.8M21 3l-6 6"}],["path",{d:"M3 7.8V3m0 0h4.8M3 3l6 6"}]]];var Jc=["svg",t,[["path",{d:"M15 3h6v6"}],["path",{d:"M10 14 21 3"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}]]];var Qc=["svg",t,[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var t1=["svg",t,[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"}],["circle",{cx:"12",cy:"12",r:"3"}]]];var e1=["svg",t,[["path",{d:"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"}]]];var a1=["svg",t,[["path",{d:"M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M17 18h1"}],["path",{d:"M12 18h1"}],["path",{d:"M7 18h1"}]]];var r1=["svg",t,[["path",{d:"M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"}],["path",{d:"M12 12v.01"}]]];var o1=["svg",t,[["polygon",{points:"13 19 22 12 13 5 13 19"}],["polygon",{points:"2 19 11 12 2 5 2 19"}]]];var s1=["svg",t,[["path",{d:"M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"}],["line",{x1:"16",x2:"2",y1:"8",y2:"22"}],["line",{x1:"17.5",x2:"9",y1:"15",y2:"15"}]]];var i1=["svg",t,[["path",{d:"M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}],["path",{d:"M6 8h4"}],["path",{d:"M6 18h4"}],["path",{d:"m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}],["path",{d:"M14 8h4"}],["path",{d:"M14 18h4"}],["path",{d:"m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}]]];var n1=["svg",t,[["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M12 2v4"}],["path",{d:"m6.8 15-3.5 2"}],["path",{d:"m20.7 7-3.5 2"}],["path",{d:"M6.8 9 3.3 7"}],["path",{d:"m20.7 17-3.5-2"}],["path",{d:"m9 22 3-8 3 8"}],["path",{d:"M8 22h8"}],["path",{d:"M18 18.7a9 9 0 1 0-12 0"}]]];var l1=["svg",t,[["path",{d:"M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"}],["path",{d:"M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"}],["path",{d:"M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"}],["path",{d:"M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"}],["path",{d:"M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"}]]];var d1=["svg",t,[["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v18"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"10",cy:"20",r:"2"}],["path",{d:"M10 7V6"}],["path",{d:"M10 12v-1"}],["path",{d:"M10 18v-2"}]]];var c1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"3",cy:"17",r:"1"}],["path",{d:"M2 17v-3a4 4 0 0 1 8 0v3"}],["circle",{cx:"9",cy:"17",r:"1"}]]];var p1=["svg",t,[["path",{d:"M17.5 22h.5a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0"}]]];var pe=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 18 4-4"}],["path",{d:"M8 10v8h8"}]]];var f1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m14 12.5 1 5.5-3-1-3 1 1-5.5"}]]];var h1=["svg",t,[["path",{d:"M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"}],["path",{d:"M7 16.5 8 22l-3-1-3 1 1-5.5"}]]];var u1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 18v-1"}],["path",{d:"M12 18v-6"}],["path",{d:"M16 18v-3"}]]];var m1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 18v-2"}],["path",{d:"M12 18v-4"}],["path",{d:"M16 18v-6"}]]];var x1=["svg",t,[["path",{d:"M14.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 13.1a2 2 0 0 0-1 1.76v3.24a2 2 0 0 0 .97 1.78L6 21.7a2 2 0 0 0 2.03.01L11 19.9a2 2 0 0 0 1-1.76V14.9a2 2 0 0 0-.97-1.78L8 11.3a2 2 0 0 0-2.03-.01Z"}],["path",{d:"M7 17v5"}],["path",{d:"M11.7 14.2 7 17l-4.7-2.8"}]]];var g1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m3 15 2 2 4-4"}]]];var v1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m9 15 2 2 4-4"}]]];var y1=["svg",t,[["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"8",cy:"16",r:"6"}],["path",{d:"M9.5 17.5 8 16.25V14"}]]];var M1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m5 12-3 3 3 3"}],["path",{d:"m9 18 3-3-3-3"}]]];var b1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m10 13-2 2 2 2"}],["path",{d:"m14 17 2-2-2-2"}]]];var fe=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"6",cy:"14",r:"3"}],["path",{d:"M6 10v1"}],["path",{d:"M6 17v1"}],["path",{d:"M10 14H9"}],["path",{d:"M3 14H2"}],["path",{d:"m9 11-.88.88"}],["path",{d:"M3.88 16.12 3 17"}],["path",{d:"m9 17-.88-.88"}],["path",{d:"M3.88 11.88 3 11"}]]];var S1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M9 10h6"}],["path",{d:"M12 13V7"}],["path",{d:"M9 17h6"}]]];var A1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"4",height:"6",x:"2",y:"12",rx:"2"}],["path",{d:"M10 12h2v6"}],["path",{d:"M10 18h4"}]]];var w1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M12 18v-6"}],["path",{d:"m9 15 3 3 3-3"}]]];var C1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10.29 10.7a2.43 2.43 0 0 0-2.66-.52c-.29.12-.56.3-.78.53l-.35.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L6.5 18l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z"}]]];var L1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"10",cy:"12",r:"2"}],["path",{d:"m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"}]]];var E1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 15h10"}],["path",{d:"m9 18 3-3-3-3"}]]];var k1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"}],["path",{d:"M8 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"}]]];var P1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"}],["path",{d:"M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"}]]];var T1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v6"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"4",cy:"16",r:"2"}],["path",{d:"m10 10-4.5 4.5"}],["path",{d:"m9 11 1 1"}]]];var D1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["circle",{cx:"10",cy:"16",r:"2"}],["path",{d:"m16 10-4.5 4.5"}],["path",{d:"m15 11 1 1"}]]];var H1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m16 13-3.5 3.5-2-2L8 17"}]]];var F1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v1"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"5",x:"2",y:"13",rx:"1"}],["path",{d:"M8 13v-2a2 2 0 1 0-4 0v2"}]]];var V1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["rect",{width:"8",height:"6",x:"8",y:"12",rx:"1"}],["path",{d:"M10 12v-2a2 2 0 1 1 4 0v2"}]]];var B1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 15h6"}]]];var R1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 15h6"}]]];var I1=["svg",t,[["circle",{cx:"14",cy:"16",r:"2"}],["circle",{cx:"6",cy:"18",r:"2"}],["path",{d:"M4 12.4V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-7.5"}],["path",{d:"M8 18v-7.7L16 9v7"}]]];var $1=["svg",t,[["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 7V4a2 2 0 0 1 2-2 2 2 0 0 0-2 2"}],["path",{d:"M4.063 20.999a2 2 0 0 0 2 1L18 22a2 2 0 0 0 2-2V7l-5-5H6"}],["path",{d:"m5 11-3 3"}],["path",{d:"m5 17-3-3h10"}]]];var he=["svg",t,[["path",{d:"m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"}],["path",{d:"M8 18h1"}],["path",{d:"M18.4 9.6a2 2 0 1 1 3 3L17 17l-4 1 1-4Z"}]]];var ue=["svg",t,[["path",{d:"M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"}]]];var O1=["svg",t,[["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 11.5a6.02 6.02 0 1 0 8.5 8.5"}],["path",{d:"M14 16c0-3.3-2.7-6-6-6v6Z"}]]];var N1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 15h6"}],["path",{d:"M6 12v6"}]]];var q1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 15h6"}],["path",{d:"M12 18v-6"}]]];var W1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"}],["path",{d:"M12 17h.01"}]]];var Z1=["svg",t,[["path",{d:"M20 10V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M16 14a2 2 0 0 0-2 2"}],["path",{d:"M20 14a2 2 0 0 1 2 2"}],["path",{d:"M20 22a2 2 0 0 0 2-2"}],["path",{d:"M16 22a2 2 0 0 1-2-2"}]]];var U1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"11.5",cy:"14.5",r:"2.5"}],["path",{d:"M13.3 16.3 15 18"}]]];var G1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"5",cy:"14",r:"3"}],["path",{d:"m9 18-1.5-1.5"}]]];var _1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 12h8"}],["path",{d:"M10 11v2"}],["path",{d:"M8 17h8"}],["path",{d:"M14 16v2"}]]];var z1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 13h2"}],["path",{d:"M14 13h2"}],["path",{d:"M8 17h2"}],["path",{d:"M14 17h2"}]]];var j1=["svg",t,[["path",{d:"M21 7h-3a2 2 0 0 1-2-2V2"}],["path",{d:"M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z"}],["path",{d:"M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15"}],["path",{d:"M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11"}]]];var X1=["svg",t,[["path",{d:"m10 18 3-3-3-3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 11V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"}]]];var K1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 16 2-2-2-2"}],["path",{d:"M12 18h4"}]]];var Y1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10 9H8"}],["path",{d:"M16 13H8"}],["path",{d:"M16 17H8"}]]];var J1=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 13v-1h6v1"}],["path",{d:"M5 12v6"}],["path",{d:"M4 18h2"}]]];var Q1=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 13v-1h6v1"}],["path",{d:"M12 12v6"}],["path",{d:"M11 18h2"}]]];var tp=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M12 12v6"}],["path",{d:"m15 15-3-3-3 3"}]]];var ep=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"6",x:"2",y:"12",rx:"1"}],["path",{d:"m10 15.5 4 2.5v-6l-4 2.5"}]]];var ap=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m10 11 5 3-5 3v-6Z"}]]];var rp=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 15h.01"}],["path",{d:"M11.5 13.5a2.5 2.5 0 0 1 0 3"}],["path",{d:"M15 12a5 5 0 0 1 0 6"}]]];var op=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m7 10-3 2H2v4h2l3 2Z"}],["path",{d:"M11 11a5 5 0 0 1 0 6"}]]];var sp=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M12 9v4"}],["path",{d:"M12 17h.01"}]]];var ip=["svg",t,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 12.5-5 5"}],["path",{d:"m3 12.5 5 5"}]]];var np=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m14.5 12.5-5 5"}],["path",{d:"m9.5 12.5 5 5"}]]];var lp=["svg",t,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}]]];var dp=["svg",t,[["path",{d:"M20 7h-3a2 2 0 0 1-2-2V2"}],["path",{d:"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"}],["path",{d:"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"}]]];var cp=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 3v18"}],["path",{d:"M3 7.5h4"}],["path",{d:"M3 12h18"}],["path",{d:"M3 16.5h4"}],["path",{d:"M17 3v18"}],["path",{d:"M17 7.5h4"}],["path",{d:"M17 16.5h4"}]]];var pp=["svg",t,[["path",{d:"M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055"}],["path",{d:"m22 3-5 5"}],["path",{d:"m17 3 5 5"}]]];var fp=["svg",t,[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"}]]];var hp=["svg",t,[["path",{d:"M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"}],["path",{d:"M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"}],["path",{d:"M17.29 21.02c.12-.6.43-2.3.5-3.02"}],["path",{d:"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"}],["path",{d:"M8.65 22c.21-.66.45-1.32.57-2"}],["path",{d:"M14 13.12c0 2.38 0 6.38-1 8.88"}],["path",{d:"M2 16h.01"}],["path",{d:"M21.8 16c.2-2 .131-5.354 0-6"}],["path",{d:"M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"}]]];var up=["svg",t,[["path",{d:"M15 6.5V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3.5"}],["path",{d:"M9 18h8"}],["path",{d:"M18 3h-3"}],["path",{d:"M11 3a6 6 0 0 0-6 6v11"}],["path",{d:"M5 13h4"}],["path",{d:"M17 10a4 4 0 0 0-8 0v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2Z"}]]];var mp=["svg",t,[["path",{d:"M18 12.47v.03m0-.5v.47m-.475 5.056A6.744 6.744 0 0 1 15 18c-3.56 0-7.56-2.53-8.5-6 .348-1.28 1.114-2.433 2.121-3.38m3.444-2.088A8.802 8.802 0 0 1 15 6c3.56 0 6.06 2.54 7 6-.309 1.14-.786 2.177-1.413 3.058"}],["path",{d:"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33m7.48-4.372A9.77 9.77 0 0 1 16 6.07m0 11.86a9.77 9.77 0 0 1-1.728-3.618"}],["path",{d:"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98M8.53 3h5.27a2 2 0 0 1 1.98 1.67l.23 1.4M2 2l20 20"}]]];var xp=["svg",t,[["path",{d:"M2 16s9-15 20-4C11 23 2 8 2 8"}]]];var gp=["svg",t,[["path",{d:"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"}],["path",{d:"M18 12v.5"}],["path",{d:"M16 17.93a9.77 9.77 0 0 1 0-11.86"}],["path",{d:"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"}],["path",{d:"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"}],["path",{d:"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"}]]];var vp=["svg",t,[["path",{d:"M8 2c3 0 5 2 8 2s4-1 4-1v11"}],["path",{d:"M4 22V4"}],["path",{d:"M4 15s1-1 4-1 5 2 8 2"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var yp=["svg",t,[["path",{d:"M17 22V2L7 7l10 5"}]]];var Mp=["svg",t,[["path",{d:"M7 22V2l10 5-10 5"}]]];var bp=["svg",t,[["path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}],["line",{x1:"4",x2:"4",y1:"22",y2:"15"}]]];var Sp=["svg",t,[["path",{d:"M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-.3 0-.6.1-.9a2 2 0 1 0 3.3-2C8 4.5 11 2 12 2Z"}],["path",{d:"m5 22 14-4"}],["path",{d:"m5 18 14 4"}]]];var Ap=["svg",t,[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"}]]];var wp=["svg",t,[["path",{d:"M16 16v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4"}],["path",{d:"M7 2h11v4c0 2-2 2-2 4v1"}],["line",{x1:"11",x2:"18",y1:"6",y2:"6"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Cp=["svg",t,[["path",{d:"M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z"}],["line",{x1:"6",x2:"18",y1:"6",y2:"6"}],["line",{x1:"12",x2:"12",y1:"12",y2:"12"}]]];var Lp=["svg",t,[["path",{d:"M10 10 4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-1.272-2.542"}],["path",{d:"M10 2v2.343"}],["path",{d:"M14 2v6.343"}],["path",{d:"M8.5 2h7"}],["path",{d:"M7 16h9"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Ep=["svg",t,[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"}],["path",{d:"M8.5 2h7"}],["path",{d:"M7 16h10"}]]];var kp=["svg",t,[["path",{d:"M10 2v7.31"}],["path",{d:"M14 9.3V1.99"}],["path",{d:"M8.5 2h7"}],["path",{d:"M14 9.3a6.5 6.5 0 1 1-4 0"}],["path",{d:"M5.52 16h12.96"}]]];var Pp=["svg",t,[["path",{d:"m3 7 5 5-5 5V7"}],["path",{d:"m21 7-5 5 5 5V7"}],["path",{d:"M12 20v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 2v2"}]]];var Tp=["svg",t,[["path",{d:"M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"}],["path",{d:"M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"}],["path",{d:"M12 20v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 2v2"}]]];var Dp=["svg",t,[["path",{d:"m17 3-5 5-5-5h10"}],["path",{d:"m17 21-5-5-5 5h10"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];var Hp=["svg",t,[["path",{d:"M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"}],["path",{d:"M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];var Fp=["svg",t,[["path",{d:"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M12 10v12"}],["path",{d:"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"}],["path",{d:"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"}]]];var Vp=["svg",t,[["path",{d:"M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5m4.5-4.5H15m-3 4.5V15"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m8 16 1.5-1.5"}],["path",{d:"M14.5 9.5 16 8"}],["path",{d:"m8 8 1.5 1.5"}],["path",{d:"M14.5 14.5 16 16"}]]];var Bp=["svg",t,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}]]];var Rp=["svg",t,[["path",{d:"M2 12h6"}],["path",{d:"M22 12h-6"}],["path",{d:"M12 2v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 20v2"}],["path",{d:"m19 9-3 3 3 3"}],["path",{d:"m5 15 3-3-3-3"}]]];var Ip=["svg",t,[["path",{d:"M12 22v-6"}],["path",{d:"M12 8V2"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}],["path",{d:"m15 19-3-3-3 3"}],["path",{d:"m15 5-3 3-3-3"}]]];var $p=["svg",t,[["circle",{cx:"15",cy:"19",r:"2"}],["path",{d:"M20.9 19.8A2 2 0 0 0 22 18V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h5.1"}],["path",{d:"M15 11v-1"}],["path",{d:"M15 17v-2"}]]];var Op=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"m9 13 2 2 4-4"}]]];var Np=["svg",t,[["circle",{cx:"16",cy:"16",r:"6"}],["path",{d:"M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2"}],["path",{d:"M16 14v2l1 1"}]]];var qp=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M2 10h20"}]]];var me=["svg",t,[["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"M10.3 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3.3"}],["path",{d:"m21.7 19.4-.9-.3"}],["path",{d:"m15.2 16.9-.9-.3"}],["path",{d:"m16.6 21.7.3-.9"}],["path",{d:"m19.1 15.2.3-.9"}],["path",{d:"m19.6 21.7-.4-1"}],["path",{d:"m16.8 15.3-.4-1"}],["path",{d:"m14.3 19.6 1-.4"}],["path",{d:"m20.7 16.8 1-.4"}]]];var Wp=["svg",t,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["circle",{cx:"12",cy:"13",r:"1"}]]];var Zp=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M12 10v6"}],["path",{d:"m15 13-3 3-3-3"}]]];var Up=["svg",t,[["path",{d:"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"}],["circle",{cx:"13",cy:"12",r:"2"}],["path",{d:"M18 19c-2.8 0-5-2.2-5-5v8"}],["circle",{cx:"20",cy:"19",r:"2"}]]];var Gp=["svg",t,[["circle",{cx:"12",cy:"13",r:"2"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M14 13h3"}],["path",{d:"M7 13h3"}]]];var _p=["svg",t,[["path",{d:"M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"}],["path",{d:"M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"}]]];var zp=["svg",t,[["path",{d:"M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"}],["path",{d:"M2 13h10"}],["path",{d:"m9 16 3-3-3-3"}]]];var jp=["svg",t,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["path",{d:"M8 10v4"}],["path",{d:"M12 10v2"}],["path",{d:"M16 10v6"}]]];var Xp=["svg",t,[["circle",{cx:"16",cy:"20",r:"2"}],["path",{d:"M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"}],["path",{d:"m22 14-4.5 4.5"}],["path",{d:"m21 15 1 1"}]]];var Kp=["svg",t,[["rect",{width:"8",height:"5",x:"14",y:"17",rx:"1"}],["path",{d:"M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2.5"}],["path",{d:"M20 17v-2a2 2 0 1 0-4 0v2"}]]];var Yp=["svg",t,[["path",{d:"M9 13h6"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];var Jp=["svg",t,[["path",{d:"m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"}],["circle",{cx:"14",cy:"15",r:"1"}]]];var Qp=["svg",t,[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"}]]];var t2=["svg",t,[["path",{d:"M2 7.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-1.5"}],["path",{d:"M2 13h10"}],["path",{d:"m5 10-3 3 3 3"}]]];var xe=["svg",t,[["path",{d:"M8.4 10.6a2 2 0 0 1 3 3L6 19l-4 1 1-4Z"}],["path",{d:"M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"}]]];var e2=["svg",t,[["path",{d:"M12 10v6"}],["path",{d:"M9 13h6"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];var a2=["svg",t,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["circle",{cx:"12",cy:"13",r:"2"}],["path",{d:"M12 15v5"}]]];var r2=["svg",t,[["circle",{cx:"11.5",cy:"12.5",r:"2.5"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M13.3 14.3 15 16"}]]];var o2=["svg",t,[["circle",{cx:"17",cy:"17",r:"3"}],["path",{d:"M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"}],["path",{d:"m21 21-1.5-1.5"}]]];var s2=["svg",t,[["path",{d:"M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"}],["path",{d:"m8 16 3-3-3-3"}]]];var i2=["svg",t,[["path",{d:"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"}],["path",{d:"M12 10v4h4"}],["path",{d:"m12 14 1.535-1.605a5 5 0 0 1 8 1.5"}],["path",{d:"M22 22v-4h-4"}],["path",{d:"m22 18-1.535 1.605a5 5 0 0 1-8-1.5"}]]];var n2=["svg",t,[["path",{d:"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"}],["path",{d:"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"}],["path",{d:"M3 5a2 2 0 0 0 2 2h3"}],["path",{d:"M3 3v13a2 2 0 0 0 2 2h3"}]]];var l2=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M12 10v6"}],["path",{d:"m9 13 3-3 3 3"}]]];var d2=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"m9.5 10.5 5 5"}],["path",{d:"m14.5 10.5-5 5"}]]];var c2=["svg",t,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];var p2=["svg",t,[["path",{d:"M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.9a2 2 0 0 1-1.69-.9l-.81-1.2a2 2 0 0 0-1.67-.9H8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"}],["path",{d:"M2 8v11a2 2 0 0 0 2 2h14"}]]];var f2=["svg",t,[["path",{d:"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{d:"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{d:"M16 17h4"}],["path",{d:"M4 13h4"}]]];var h2=["svg",t,[["path",{d:"M12 12H5a2 2 0 0 0-2 2v5"}],["circle",{cx:"13",cy:"19",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M8 19h3m5-17v17h6M6 12V7c0-1.1.9-2 2-2h3l5 5"}]]];var u2=["svg",t,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}],["path",{d:"M12 12h.01"}],["path",{d:"M17 12h.01"}],["path",{d:"M7 12h.01"}]]];var m2=["svg",t,[["polyline",{points:"15 17 20 12 15 7"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12"}]]];var x2=["svg",t,[["line",{x1:"22",x2:"2",y1:"6",y2:"6"}],["line",{x1:"22",x2:"2",y1:"18",y2:"18"}],["line",{x1:"6",x2:"6",y1:"2",y2:"22"}],["line",{x1:"18",x2:"18",y1:"2",y2:"22"}]]];var g2=["svg",t,[["path",{d:"M5 16V9h14V2H5l14 14h-7m-7 0 7 7v-7m-7 0h7"}]]];var v2=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];var y2=["svg",t,[["line",{x1:"3",x2:"15",y1:"22",y2:"22"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"}]]];var M2=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["rect",{width:"10",height:"8",x:"7",y:"8",rx:"1"}]]];var b2=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"}],["path",{d:"M9 11.2h5.7"}]]];var S2=["svg",t,[["path",{d:"M2 7v10"}],["path",{d:"M6 5v14"}],["rect",{width:"12",height:"18",x:"10",y:"3",rx:"2"}]]];var A2=["svg",t,[["path",{d:"M2 3v18"}],["rect",{width:"12",height:"18",x:"6",y:"3",rx:"2"}],["path",{d:"M22 3v18"}]]];var w2=["svg",t,[["rect",{width:"18",height:"14",x:"3",y:"3",rx:"2"}],["path",{d:"M4 21h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 21h1"}],["path",{d:"M19 21h1"}]]];var C2=["svg",t,[["path",{d:"M7 2h10"}],["path",{d:"M5 6h14"}],["rect",{width:"18",height:"12",x:"3",y:"10",rx:"2"}]]];var L2=["svg",t,[["path",{d:"M3 2h18"}],["rect",{width:"18",height:"12",x:"3",y:"6",rx:"2"}],["path",{d:"M3 22h18"}]]];var E2=["svg",t,[["line",{x1:"6",x2:"10",y1:"11",y2:"11"}],["line",{x1:"8",x2:"8",y1:"9",y2:"13"}],["line",{x1:"15",x2:"15.01",y1:"12",y2:"12"}],["line",{x1:"18",x2:"18.01",y1:"10",y2:"10"}],["path",{d:"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"}]]];var k2=["svg",t,[["line",{x1:"6",x2:"10",y1:"12",y2:"12"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14"}],["line",{x1:"15",x2:"15.01",y1:"13",y2:"13"}],["line",{x1:"18",x2:"18.01",y1:"11",y2:"11"}],["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];var Pt=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 8h7"}],["path",{d:"M8 12h6"}],["path",{d:"M11 16h5"}]]];var P2=["svg",t,[["path",{d:"M8 6h10"}],["path",{d:"M6 12h9"}],["path",{d:"M11 18h7"}]]];var T2=["svg",t,[["path",{d:"M15.6 2.7a10 10 0 1 0 5.7 5.7"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M13.4 10.6 19 5"}]]];var D2=["svg",t,[["path",{d:"m12 14 4-4"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0"}]]];var H2=["svg",t,[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"}],["path",{d:"m16 16 6-6"}],["path",{d:"m8 8 6-6"}],["path",{d:"m9 7 8 8"}],["path",{d:"m21 11-8-8"}]]];var F2=["svg",t,[["path",{d:"M6 3h12l4 6-10 13L2 9Z"}],["path",{d:"M11 3 8 9l4 13 4-13-3-6"}],["path",{d:"M2 9h20"}]]];var V2=["svg",t,[["path",{d:"M9 10h.01"}],["path",{d:"M15 10h.01"}],["path",{d:"M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"}]]];var B2=["svg",t,[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1"}],["path",{d:"M12 8v13"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"}]]];var R2=["svg",t,[["path",{d:"M6 3v12"}],["path",{d:"M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"}],["path",{d:"M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"}],["path",{d:"M15 6a9 9 0 0 0-9 9"}],["path",{d:"M18 15v6"}],["path",{d:"M21 18h-6"}]]];var I2=["svg",t,[["line",{x1:"6",x2:"6",y1:"3",y2:"15"}],["circle",{cx:"18",cy:"6",r:"3"}],["circle",{cx:"6",cy:"18",r:"3"}],["path",{d:"M18 9a9 9 0 0 1-9 9"}]]];var ge=["svg",t,[["circle",{cx:"12",cy:"12",r:"3"}],["line",{x1:"3",x2:"9",y1:"12",y2:"12"}],["line",{x1:"15",x2:"21",y1:"12",y2:"12"}]]];var $2=["svg",t,[["path",{d:"M12 3v6"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M12 15v6"}]]];var O2=["svg",t,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v7"}],["path",{d:"m15 9-3-3 3-3"}],["circle",{cx:"19",cy:"18",r:"3"}],["path",{d:"M12 18H7a2 2 0 0 1-2-2V9"}],["path",{d:"m9 15 3 3-3 3"}]]];var N2=["svg",t,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v7"}],["path",{d:"M11 18H8a2 2 0 0 1-2-2V9"}]]];var q2=["svg",t,[["circle",{cx:"12",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["circle",{cx:"18",cy:"6",r:"3"}],["path",{d:"M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"}],["path",{d:"M12 12v3"}]]];var W2=["svg",t,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v6"}],["circle",{cx:"5",cy:"18",r:"3"}],["path",{d:"M12 3v18"}],["circle",{cx:"19",cy:"6",r:"3"}],["path",{d:"M16 15.7A9 9 0 0 0 19 9"}]]];var Z2=["svg",t,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9"}]]];var U2=["svg",t,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v12"}],["circle",{cx:"19",cy:"18",r:"3"}],["path",{d:"m15 9-3-3 3-3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v7"}]]];var G2=["svg",t,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 9v12"}],["path",{d:"m21 3-6 6"}],["path",{d:"m21 9-6-6"}],["path",{d:"M18 11.5V15"}],["circle",{cx:"18",cy:"18",r:"3"}]]];var _2=["svg",t,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v12"}],["path",{d:"m15 9-3-3 3-3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v3"}],["path",{d:"M19 15v6"}],["path",{d:"M22 18h-6"}]]];var z2=["svg",t,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 9v12"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v3"}],["path",{d:"M18 15v6"}],["path",{d:"M21 18h-6"}]]];var j2=["svg",t,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M18 6V5"}],["path",{d:"M18 11v-1"}],["line",{x1:"6",x2:"6",y1:"9",y2:"21"}]]];var X2=["svg",t,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v7"}],["line",{x1:"6",x2:"6",y1:"9",y2:"21"}]]];var K2=["svg",t,[["path",{d:"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"}],["path",{d:"M9 18c-4.51 2-5-2-7-2"}]]];var Y2=["svg",t,[["path",{d:"m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.1 3.26a.42.42 0 0 0-.1-.18.38.38 0 0 0-.26-.08.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z"}]]];var J2=["svg",t,[["path",{d:"M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z"}],["path",{d:"M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"}]]];var Q2=["svg",t,[["circle",{cx:"6",cy:"15",r:"4"}],["circle",{cx:"18",cy:"15",r:"4"}],["path",{d:"M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"}],["path",{d:"M2.5 13 5 7c.7-1.3 1.4-2 3-2"}],["path",{d:"M21.5 13 19 7c-.7-1.3-1.5-2-3-2"}]]];var tf=["svg",t,[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"}],["circle",{cx:"12",cy:"12",r:"10"}]]];var ef=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}],["path",{d:"M2 12h20"}]]];var af=["svg",t,[["path",{d:"M12 13V2l8 4-8 4"}],["path",{d:"M20.55 10.23A9 9 0 1 1 8 4.94"}],["path",{d:"M8 10a5 5 0 1 0 8.9 2.02"}]]];var rf=["svg",t,[["path",{d:"M18 11.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"}],["path",{d:"M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"}],["path",{d:"M10 9.9V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"}],["path",{d:"M6 14v0a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M18 11v0a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"}]]];var of=["svg",t,[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"}],["path",{d:"M22 10v6"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5"}]]];var sf=["svg",t,[["path",{d:"M22 5V2l-5.89 5.89"}],["circle",{cx:"16.6",cy:"15.89",r:"3"}],["circle",{cx:"8.11",cy:"7.4",r:"3"}],["circle",{cx:"12.35",cy:"11.65",r:"3"}],["circle",{cx:"13.91",cy:"5.85",r:"3"}],["circle",{cx:"18.15",cy:"10.09",r:"3"}],["circle",{cx:"6.56",cy:"13.2",r:"3"}],["circle",{cx:"10.8",cy:"17.44",r:"3"}],["circle",{cx:"5",cy:"19",r:"3"}]]];var ve=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 12h18"}],["path",{d:"M12 3v18"}]]];var Tt=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]]];var nf=["svg",t,[["circle",{cx:"12",cy:"9",r:"1"}],["circle",{cx:"19",cy:"9",r:"1"}],["circle",{cx:"5",cy:"9",r:"1"}],["circle",{cx:"12",cy:"15",r:"1"}],["circle",{cx:"19",cy:"15",r:"1"}],["circle",{cx:"5",cy:"15",r:"1"}]]];var lf=["svg",t,[["circle",{cx:"9",cy:"12",r:"1"}],["circle",{cx:"9",cy:"5",r:"1"}],["circle",{cx:"9",cy:"19",r:"1"}],["circle",{cx:"15",cy:"12",r:"1"}],["circle",{cx:"15",cy:"5",r:"1"}],["circle",{cx:"15",cy:"19",r:"1"}]]];var df=["svg",t,[["circle",{cx:"12",cy:"5",r:"1"}],["circle",{cx:"19",cy:"5",r:"1"}],["circle",{cx:"5",cy:"5",r:"1"}],["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}],["circle",{cx:"12",cy:"19",r:"1"}],["circle",{cx:"19",cy:"19",r:"1"}],["circle",{cx:"5",cy:"19",r:"1"}]]];var cf=["svg",t,[["path",{d:"M3 7V5c0-1.1.9-2 2-2h2"}],["path",{d:"M17 3h2c1.1 0 2 .9 2 2v2"}],["path",{d:"M21 17v2c0 1.1-.9 2-2 2h-2"}],["path",{d:"M7 21H5c-1.1 0-2-.9-2-2v-2"}],["rect",{width:"7",height:"5",x:"7",y:"7",rx:"1"}],["rect",{width:"7",height:"5",x:"10",y:"12",rx:"1"}]]];var pf=["svg",t,[["path",{d:"m20 7 1.7-1.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L17 4v3Z"}],["path",{d:"m17 7-5.1 5.1"}],["circle",{cx:"11.5",cy:"12.5",r:".5",fill:"currentColor"}],["path",{d:"M6 12a2 2 0 0 0 1.8-1.2l.4-.9C8.7 8.8 9.8 8 11 8c2.8 0 5 2.2 5 5 0 1.2-.8 2.3-1.9 2.8l-.9.4A2 2 0 0 0 12 18a4 4 0 0 1-4 4c-3.3 0-6-2.7-6-6a4 4 0 0 1 4-4"}],["path",{d:"m6 16 2 2"}]]];var ff=["svg",t,[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"}],["path",{d:"m18 15 4-4"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"}]]];var hf=["svg",t,[["path",{d:"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"}],["path",{d:"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 16 6 6"}],["circle",{cx:"16",cy:"9",r:"2.9"}],["circle",{cx:"6",cy:"5",r:"3"}]]];var uf=["svg",t,[["path",{d:"M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"}],["path",{d:"m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 15 6 6"}],["path",{d:"M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"}]]];var ye=["svg",t,[["path",{d:"M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"}],["path",{d:"m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 13 6 6"}]]];var mf=["svg",t,[["path",{d:"M18 12.5V10a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"}],["path",{d:"M14 11V9a2 2 0 1 0-4 0v2"}],["path",{d:"M10 10.5V5a2 2 0 1 0-4 0v9"}],["path",{d:"m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"}]]];var xf=["svg",t,[["path",{d:"M12 3V2"}],["path",{d:"M5 10a7.1 7.1 0 0 1 14 0"}],["path",{d:"M4 10h16"}],["path",{d:"M2 14h12a2 2 0 1 1 0 4h-2"}],["path",{d:"m15.4 17.4 3.2-2.8a2 2 0 0 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2L5 18"}],["path",{d:"M5 14v7H2"}]]];var gf=["svg",t,[["path",{d:"M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]]];var vf=["svg",t,[["path",{d:"m11 17 2 2a1 1 0 1 0 3-3"}],["path",{d:"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"}],["path",{d:"m21 3 1 11h-2"}],["path",{d:"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"}],["path",{d:"M3 4h8"}]]];var yf=["svg",t,[["path",{d:"M12 2v8"}],["path",{d:"m16 6-4 4-4-4"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 18h.01"}]]];var Mf=["svg",t,[["path",{d:"m16 6-4-4-4 4"}],["path",{d:"M12 2v8"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 18h.01"}]]];var bf=["svg",t,[["line",{x1:"22",x2:"2",y1:"12",y2:"12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16"}]]];var Sf=["svg",t,[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6h0"}],["path",{d:"M14 6h0a6 6 0 0 1 6 6v3"}]]];var Af=["svg",t,[["line",{x1:"4",x2:"20",y1:"9",y2:"9"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21"}]]];var wf=["svg",t,[["path",{d:"m5.2 6.2 1.4 1.4"}],["path",{d:"M2 13h2"}],["path",{d:"M20 13h2"}],["path",{d:"m17.4 7.6 1.4-1.4"}],["path",{d:"M22 17H2"}],["path",{d:"M22 21H2"}],["path",{d:"M16 13a4 4 0 0 0-8 0"}],["path",{d:"M12 5V2.5"}]]];var Cf=["svg",t,[["path",{d:"M22 9a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1l2 2h12l2-2h1a1 1 0 0 0 1-1Z"}],["path",{d:"M7.5 12h9"}]]];var Lf=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"m17 12 3-2v8"}]]];var Ef=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"}]]];var kf=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"}],["path",{d:"M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"}]]];var Pf=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17 10v4h4"}],["path",{d:"M21 10v8"}]]];var Tf=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17 13v-3h4"}],["path",{d:"M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17"}]]];var Df=["svg",t,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["circle",{cx:"19",cy:"16",r:"2"}],["path",{d:"M20 10c-2 2-3 3.5-3 6"}]]];var Hf=["svg",t,[["path",{d:"M6 12h12"}],["path",{d:"M6 20V4"}],["path",{d:"M18 20V4"}]]];var Ff=["svg",t,[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"}]]];var Vf=["svg",t,[["path",{d:"M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"}],["path",{d:"M21 16v2a4 4 0 0 1-4 4h-5"}]]];var Bf=["svg",t,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"m12 13-1-1 2-2-3-3 2-2"}]]];var Rf=["svg",t,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"}],["path",{d:"m18 15-2-2"}],["path",{d:"m15 18-2-2"}]]];var If=["svg",t,[["line",{x1:"2",y1:"2",x2:"22",y2:"22"}],["path",{d:"M16.5 16.5 12 21l-7-7c-1.5-1.45-3-3.2-3-5.5a5.5 5.5 0 0 1 2.14-4.35"}],["path",{d:"M8.76 3.1c1.15.22 2.13.78 3.24 1.9 1.5-1.5 2.74-2 4.5-2A5.5 5.5 0 0 1 22 8.5c0 2.12-1.3 3.78-2.67 5.17"}]]];var $f=["svg",t,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"}]]];var Of=["svg",t,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}]]];var Nf=["svg",t,[["path",{d:"M11 8c2-3-2-3 0-6"}],["path",{d:"M15.5 8c2-3-2-3 0-6"}],["path",{d:"M6 10h.01"}],["path",{d:"M6 14h.01"}],["path",{d:"M10 16v-4"}],["path",{d:"M14 16v-4"}],["path",{d:"M18 16v-4"}],["path",{d:"M20 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"}],["path",{d:"M5 20v2"}],["path",{d:"M19 20v2"}]]];var qf=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];var Wf=["svg",t,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}]]];var Zf=["svg",t,[["path",{d:"m9 11-6 6v3h9l3-3"}],["path",{d:"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"}]]];var Uf=["svg",t,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}],["path",{d:"M12 7v5l4 2"}]]];var Gf=["svg",t,[["path",{d:"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}],["polyline",{points:"9 22 9 12 15 12 15 22"}]]];var _f=["svg",t,[["path",{d:"M10.82 16.12c1.69.6 3.91.79 5.18.85.28.01.53-.09.7-.27"}],["path",{d:"M11.14 20.57c.52.24 2.44 1.12 4.08 1.37.46.06.86-.25.9-.71.12-1.52-.3-3.43-.5-4.28"}],["path",{d:"M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .7-.26"}],["path",{d:"M17.99 5.52a20.83 20.83 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-1.17.1-2.5.02-3.9-.25"}],["path",{d:"M20.57 11.14c.24.52 1.12 2.44 1.37 4.08.04.3-.08.59-.31.75"}],["path",{d:"M4.93 4.93a10 10 0 0 0-.67 13.4c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.85.85 0 0 0 .48-.24"}],["path",{d:"M5.52 17.99c1.05.95 2.91 2.42 4.5 3.15a.8.8 0 0 0 1.13-.68c.2-2.34-.33-5.3-1.57-8.28"}],["path",{d:"M8.35 2.68a10 10 0 0 1 9.98 1.58c.43.35.4.96-.12 1.17-1.5.6-4.3.98-6.07 1.05"}],["path",{d:"m2 2 20 20"}]]];var zf=["svg",t,[["path",{d:"M10.82 16.12c1.69.6 3.91.79 5.18.85.55.03 1-.42.97-.97-.06-1.27-.26-3.5-.85-5.18"}],["path",{d:"M11.5 6.5c1.64 0 5-.38 6.71-1.07.52-.2.55-.82.12-1.17A10 10 0 0 0 4.26 18.33c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.88.88 0 0 0 .73-.74c.3-2.14-.15-3.5-.61-4.88"}],["path",{d:"M15.62 16.95c.2.85.62 2.76.5 4.28a.77.77 0 0 1-.9.7 16.64 16.64 0 0 1-4.08-1.36"}],["path",{d:"M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .96-.96 17.68 17.68 0 0 0-.9-4.87"}],["path",{d:"M16.94 15.62c.86.2 2.77.62 4.29.5a.77.77 0 0 0 .7-.9 16.64 16.64 0 0 0-1.36-4.08"}],["path",{d:"M17.99 5.52a20.82 20.82 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-2.33.2-5.3-.32-8.27-1.57"}],["path",{d:"M4.93 4.93 3 3a.7.7 0 0 1 0-1"}],["path",{d:"M9.58 12.18c1.24 2.98 1.77 5.95 1.57 8.28a.8.8 0 0 1-1.13.68 20.82 20.82 0 0 1-4.5-3.15"}]]];var jf=["svg",t,[["path",{d:"M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"}],["path",{d:"m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"}],["path",{d:"M8 7h.01"}],["path",{d:"M16 7h.01"}],["path",{d:"M12 7h.01"}],["path",{d:"M12 11h.01"}],["path",{d:"M16 11h.01"}],["path",{d:"M8 11h.01"}],["path",{d:"M10 22v-6.5m4 0V22"}]]];var Xf=["svg",t,[["path",{d:"M5 22h14"}],["path",{d:"M5 2h14"}],["path",{d:"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"}],["path",{d:"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"}]]];var Kf=["svg",t,[["path",{d:"M12 17c5 0 8-2.69 8-6H4c0 3.31 3 6 8 6Zm-4 4h8m-4-3v3M5.14 11a3.5 3.5 0 1 1 6.71 0"}],["path",{d:"M12.14 11a3.5 3.5 0 1 1 6.71 0"}],["path",{d:"M15.5 6.5a3.5 3.5 0 1 0-7 0"}]]];var Yf=["svg",t,[["path",{d:"m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"}],["path",{d:"M17 7A5 5 0 0 0 7 7"}],["path",{d:"M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"}]]];var Jf=["svg",t,[["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10.8"}],["path",{d:"m21 15-3.1-3.1a2 2 0 0 0-2.814.014L6 21"}],["path",{d:"m14 19.5 3 3v-6"}],["path",{d:"m17 22.5 3-3"}]]];var Qf=["svg",t,[["path",{d:"M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];var th=["svg",t,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9"}]]];var eh=["svg",t,[["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5"}],["line",{x1:"19",x2:"19",y1:"2",y2:"8"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];var ah=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];var rh=["svg",t,[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"}],["circle",{cx:"12",cy:"8",r:"2"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2"}]]];var oh=["svg",t,[["path",{d:"M12 3v12"}],["path",{d:"m8 11 4 4 4-4"}],["path",{d:"M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"}]]];var sh=["svg",t,[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}]]];var ih=["svg",t,[["polyline",{points:"3 8 7 12 3 16"}],["line",{x1:"21",x2:"11",y1:"12",y2:"12"}],["line",{x1:"21",x2:"11",y1:"6",y2:"6"}],["line",{x1:"21",x2:"11",y1:"18",y2:"18"}]]];var nh=["svg",t,[["path",{d:"M6 3h12"}],["path",{d:"M6 8h12"}],["path",{d:"m6 13 8.5 8"}],["path",{d:"M6 13h3"}],["path",{d:"M9 13c6.667 0 6.667-10 0-10"}]]];var lh=["svg",t,[["path",{d:"M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"}]]];var dh=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 16v-4"}],["path",{d:"M12 8h.01"}]]];var ch=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7h.01"}],["path",{d:"M17 7h.01"}],["path",{d:"M7 17h.01"}],["path",{d:"M17 17h.01"}]]];var ph=["svg",t,[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5"}]]];var fh=["svg",t,[["line",{x1:"19",x2:"10",y1:"4",y2:"4"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20"}]]];var hh=["svg",t,[["path",{d:"M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8h8"}],["polyline",{points:"16 14 20 18 16 22"}]]];var uh=["svg",t,[["path",{d:"M4 10c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8H4"}],["polyline",{points:"8 22 4 18 8 14"}]]];var mh=["svg",t,[["path",{d:"M12 9.5V21m0-11.5L6 3m6 6.5L18 3"}],["path",{d:"M6 15h12"}],["path",{d:"M6 11h12"}]]];var xh=["svg",t,[["path",{d:"M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z"}],["path",{d:"M6 15v-2"}],["path",{d:"M12 15V9"}],["circle",{cx:"12",cy:"6",r:"3"}]]];var Me=["svg",t,[["path",{d:"M8 7v7"}],["path",{d:"M12 7v4"}],["path",{d:"M16 7v9"}],["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M9 3h1"}],["path",{d:"M14 3h1"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 9v1"}],["path",{d:"M21 14v1"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M14 21h1"}],["path",{d:"M9 21h1"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M3 14v1"}],["path",{d:"M3 9v1"}]]];var be=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 7v7"}],["path",{d:"M12 7v4"}],["path",{d:"M16 7v9"}]]];var gh=["svg",t,[["path",{d:"M6 5v11"}],["path",{d:"M12 5v6"}],["path",{d:"M18 5v14"}]]];var vh=["svg",t,[["path",{d:"M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor"}]]];var yh=["svg",t,[["path",{d:"M12.4 2.7c.9-.9 2.5-.9 3.4 0l5.5 5.5c.9.9.9 2.5 0 3.4l-3.7 3.7c-.9.9-2.5.9-3.4 0L8.7 9.8c-.9-.9-.9-2.5 0-3.4Z"}],["path",{d:"m14 7 3 3"}],["path",{d:"M9.4 10.6 2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4"}]]];var Mh=["svg",t,[["circle",{cx:"7.5",cy:"15.5",r:"5.5"}],["path",{d:"m21 2-9.6 9.6"}],["path",{d:"m15.5 7.5 3 3L22 7l-3-3"}]]];var bh=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M6 8h4"}],["path",{d:"M14 8h.01"}],["path",{d:"M18 8h.01"}],["path",{d:"M2 12h20"}],["path",{d:"M6 12v4"}],["path",{d:"M10 12v4"}],["path",{d:"M14 12v4"}],["path",{d:"M18 12v4"}]]];var Sh=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",ry:"2"}],["path",{d:"M6 8h.001"}],["path",{d:"M10 8h.001"}],["path",{d:"M14 8h.001"}],["path",{d:"M18 8h.001"}],["path",{d:"M8 12h.001"}],["path",{d:"M12 12h.001"}],["path",{d:"M16 12h.001"}],["path",{d:"M7 16h10"}]]];var Ah=["svg",t,[["path",{d:"M12 2v5"}],["path",{d:"M6 7h12l4 9H2l4-9Z"}],["path",{d:"M9.17 16a3 3 0 1 0 5.66 0"}]]];var wh=["svg",t,[["path",{d:"m14 5-3 3 2 7 8-8-7-2Z"}],["path",{d:"m14 5-3 3-3-3 3-3 3 3Z"}],["path",{d:"M9.5 6.5 4 12l3 6"}],["path",{d:"M3 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H3Z"}]]];var Ch=["svg",t,[["path",{d:"M9 2h6l3 7H6l3-7Z"}],["path",{d:"M12 9v13"}],["path",{d:"M9 22h6"}]]];var Lh=["svg",t,[["path",{d:"M11 13h6l3 7H8l3-7Z"}],["path",{d:"M14 13V8a2 2 0 0 0-2-2H8"}],["path",{d:"M4 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4v6Z"}]]];var Eh=["svg",t,[["path",{d:"M11 4h6l3 7H8l3-7Z"}],["path",{d:"M14 11v5a2 2 0 0 1-2 2H8"}],["path",{d:"M4 15h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4v-6Z"}]]];var kh=["svg",t,[["path",{d:"M8 2h8l4 10H4L8 2Z"}],["path",{d:"M12 12v6"}],["path",{d:"M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z"}]]];var Ph=["svg",t,[["path",{d:"m12 8 6-3-6-3v10"}],["path",{d:"m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"}],["path",{d:"m6.49 12.85 11.02 6.3"}],["path",{d:"M17.51 12.85 6.5 19.15"}]]];var Th=["svg",t,[["line",{x1:"3",x2:"21",y1:"22",y2:"22"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11"}],["polygon",{points:"12 2 20 7 4 7"}]]];var Dh=["svg",t,[["path",{d:"m5 8 6 6"}],["path",{d:"m4 14 6-6 2-3"}],["path",{d:"M2 5h12"}],["path",{d:"M7 2h1"}],["path",{d:"m22 22-5-10-5 10"}],["path",{d:"M14 18h6"}]]];var Hh=["svg",t,[["rect",{width:"18",height:"12",x:"3",y:"4",rx:"2",ry:"2"}],["line",{x1:"2",x2:"22",y1:"20",y2:"20"}]]];var Fh=["svg",t,[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"}]]];var Vh=["svg",t,[["path",{d:"M7 22a5 5 0 0 1-2-4"}],["path",{d:"M7 16.93c.96.43 1.96.74 2.99.91"}],["path",{d:"M3.34 14A6.8 6.8 0 0 1 2 10c0-4.42 4.48-8 10-8s10 3.58 10 8a7.19 7.19 0 0 1-.33 2"}],["path",{d:"M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"}],["path",{d:"M14.33 22h-.09a.35.35 0 0 1-.24-.32v-10a.34.34 0 0 1 .33-.34c.08 0 .15.03.21.08l7.34 6a.33.33 0 0 1-.21.59h-4.49l-2.57 3.85a.35.35 0 0 1-.28.14v0z"}]]];var Bh=["svg",t,[["path",{d:"M7 22a5 5 0 0 1-2-4"}],["path",{d:"M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"}],["path",{d:"M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"}]]];var Rh=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];var Ih=["svg",t,[["path",{d:"m16.02 12 5.48 3.13a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74L7.98 12"}],["path",{d:"M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74Z"}]]];var $h=["svg",t,[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"}],["path",{d:"m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"}],["path",{d:"m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"}]]];var Oh=["svg",t,[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"}]]];var Nh=["svg",t,[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1"}]]];var qh=["svg",t,[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}]]];var Wh=["svg",t,[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}],["path",{d:"M14 4h7"}],["path",{d:"M14 9h7"}],["path",{d:"M14 15h7"}],["path",{d:"M14 20h7"}]]];var Zh=["svg",t,[["rect",{width:"7",height:"18",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}]]];var Uh=["svg",t,[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}]]];var Gh=["svg",t,[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"9",height:"7",x:"3",y:"14",rx:"1"}],["rect",{width:"5",height:"7",x:"16",y:"14",rx:"1"}]]];var _h=["svg",t,[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"}]]];var zh=["svg",t,[["path",{d:"M2 22c1.25-.987 2.27-1.975 3.9-2.2a5.56 5.56 0 0 1 3.8 1.5 4 4 0 0 0 6.187-2.353 3.5 3.5 0 0 0 3.69-5.116A3.5 3.5 0 0 0 20.95 8 3.5 3.5 0 1 0 16 3.05a3.5 3.5 0 0 0-5.831 1.373 3.5 3.5 0 0 0-5.116 3.69 4 4 0 0 0-2.348 6.155C3.499 15.42 4.409 16.712 4.2 18.1 3.926 19.743 3.014 20.732 2 22"}],["path",{d:"M2 22 17 7"}]]];var jh=["svg",t,[["rect",{width:"8",height:"18",x:"3",y:"3",rx:"1"}],["path",{d:"M7 3v18"}],["path",{d:"M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"}]]];var Xh=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7v10"}],["path",{d:"M11 7v10"}],["path",{d:"m15 7 2 10"}]]];var Kh=["svg",t,[["path",{d:"m16 6 4 14"}],["path",{d:"M12 6v14"}],["path",{d:"M8 8v12"}],["path",{d:"M4 4v16"}]]];var Yh=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m4.93 4.93 4.24 4.24"}],["path",{d:"m14.83 9.17 4.24-4.24"}],["path",{d:"m14.83 14.83 4.24 4.24"}],["path",{d:"m9.17 14.83-4.24 4.24"}],["circle",{cx:"12",cy:"12",r:"4"}]]];var Jh=["svg",t,[["path",{d:"M8 20V8c0-2.2 1.8-4 4-4 1.5 0 2.8.8 3.5 2"}],["path",{d:"M6 12h4"}],["path",{d:"M14 12h2v8"}],["path",{d:"M6 20h4"}],["path",{d:"M14 20h4"}]]];var Qh=["svg",t,[["path",{d:"M16.8 11.2c.8-.9 1.2-2 1.2-3.2a6 6 0 0 0-9.3-5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M6.3 6.3a4.67 4.67 0 0 0 1.2 5.2c.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]]];var tu=["svg",t,[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]]];var eu=["svg",t,[["path",{d:"M3 3v18h18"}],["path",{d:"m19 9-5 5-4-4-3 3"}]]];var au=["svg",t,[["path",{d:"M9 17H7A5 5 0 0 1 7 7"}],["path",{d:"M15 7h2a5 5 0 0 1 4 8"}],["line",{x1:"8",x2:"12",y1:"12",y2:"12"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var ru=["svg",t,[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];var ou=["svg",t,[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]]];var su=["svg",t,[["path",{d:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"}],["rect",{width:"4",height:"12",x:"2",y:"9"}],["circle",{cx:"4",cy:"4",r:"2"}]]];var iu=["svg",t,[["path",{d:"m3 17 2 2 4-4"}],["path",{d:"m3 7 2 2 4-4"}],["path",{d:"M13 6h8"}],["path",{d:"M13 12h8"}],["path",{d:"M13 18h8"}]]];var nu=["svg",t,[["path",{d:"m3 10 2.5-2.5L3 5"}],["path",{d:"m3 19 2.5-2.5L3 14"}],["path",{d:"M10 6h11"}],["path",{d:"M10 12h11"}],["path",{d:"M10 18h11"}]]];var lu=["svg",t,[["path",{d:"M16 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M10 18H3"}],["path",{d:"M21 6v10a2 2 0 0 1-2 2h-5"}],["path",{d:"m16 16-2 2 2 2"}]]];var du=["svg",t,[["path",{d:"M3 6h18"}],["path",{d:"M7 12h10"}],["path",{d:"M10 18h4"}]]];var cu=["svg",t,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"M21 12h-6"}]]];var pu=["svg",t,[["path",{d:"M21 15V6"}],["path",{d:"M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"}],["path",{d:"M12 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M12 18H3"}]]];var fu=["svg",t,[["line",{x1:"10",x2:"21",y1:"6",y2:"6"}],["line",{x1:"10",x2:"21",y1:"12",y2:"12"}],["line",{x1:"10",x2:"21",y1:"18",y2:"18"}],["path",{d:"M4 6h1v4"}],["path",{d:"M4 10h2"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"}]]];var hu=["svg",t,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"M18 9v6"}],["path",{d:"M21 12h-6"}]]];var uu=["svg",t,[["path",{d:"M21 6H3"}],["path",{d:"M7 12H3"}],["path",{d:"M7 18H3"}],["path",{d:"M12 18a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L11 14"}],["path",{d:"M11 10v4h4"}]]];var mu=["svg",t,[["path",{d:"M16 12H3"}],["path",{d:"M16 18H3"}],["path",{d:"M10 6H3"}],["path",{d:"M21 18V8a2 2 0 0 0-2-2h-5"}],["path",{d:"m16 8-2-2 2-2"}]]];var xu=["svg",t,[["rect",{x:"3",y:"5",width:"6",height:"6",rx:"1"}],["path",{d:"m3 17 2 2 4-4"}],["path",{d:"M13 6h8"}],["path",{d:"M13 12h8"}],["path",{d:"M13 18h8"}]]];var gu=["svg",t,[["path",{d:"M21 12h-8"}],["path",{d:"M21 6H8"}],["path",{d:"M21 18h-8"}],["path",{d:"M3 6v4c0 1.1.9 2 2 2h3"}],["path",{d:"M3 10v6c0 1.1.9 2 2 2h3"}]]];var vu=["svg",t,[["path",{d:"M12 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M12 18H3"}],["path",{d:"m16 12 5 3-5 3v-6Z"}]]];var yu=["svg",t,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"m19 10-4 4"}],["path",{d:"m15 10 4 4"}]]];var Mu=["svg",t,[["line",{x1:"8",x2:"21",y1:"6",y2:"6"}],["line",{x1:"8",x2:"21",y1:"12",y2:"12"}],["line",{x1:"8",x2:"21",y1:"18",y2:"18"}],["line",{x1:"3",x2:"3.01",y1:"6",y2:"6"}],["line",{x1:"3",x2:"3.01",y1:"12",y2:"12"}],["line",{x1:"3",x2:"3.01",y1:"18",y2:"18"}]]];var bu=["svg",t,[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56"}]]];var Su=["svg",t,[["line",{x1:"12",x2:"12",y1:"2",y2:"6"}],["line",{x1:"12",x2:"12",y1:"18",y2:"22"}],["line",{x1:"4.93",x2:"7.76",y1:"4.93",y2:"7.76"}],["line",{x1:"16.24",x2:"19.07",y1:"16.24",y2:"19.07"}],["line",{x1:"2",x2:"6",y1:"12",y2:"12"}],["line",{x1:"18",x2:"22",y1:"12",y2:"12"}],["line",{x1:"4.93",x2:"7.76",y1:"19.07",y2:"16.24"}],["line",{x1:"16.24",x2:"19.07",y1:"7.76",y2:"4.93"}]]];var Au=["svg",t,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["circle",{cx:"12",cy:"12",r:"7"}],["circle",{cx:"12",cy:"12",r:"3"}]]];var wu=["svg",t,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["path",{d:"M7.11 7.11C5.83 8.39 5 10.1 5 12c0 3.87 3.13 7 7 7 1.9 0 3.61-.83 4.89-2.11"}],["path",{d:"M18.71 13.96c.19-.63.29-1.29.29-1.96 0-3.87-3.13-7-7-7-.67 0-1.33.1-1.96.29"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Cu=["svg",t,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["circle",{cx:"12",cy:"12",r:"7"}]]];var Lu=["svg",t,[["circle",{cx:"12",cy:"16",r:"1"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3"}]]];var Eu=["svg",t,[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4"}]]];var ku=["svg",t,[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"}],["polyline",{points:"10 17 15 12 10 7"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12"}]]];var Pu=["svg",t,[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}],["polyline",{points:"16 17 21 12 16 7"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}]]];var Tu=["svg",t,[["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}],["path",{d:"M11 11a2 2 0 0 0 4 0 4 4 0 0 0-8 0 6 6 0 0 0 12 0"}]]];var Du=["svg",t,[["path",{d:"M6 20h0a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h0"}],["path",{d:"M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"}],["path",{d:"M10 20h4"}],["circle",{cx:"16",cy:"20",r:"2"}],["circle",{cx:"8",cy:"20",r:"2"}]]];var Hu=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 16V8l4 4 4-4v8"}]]];var Fu=["svg",t,[["path",{d:"m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"}],["path",{d:"m5 8 4 4"}],["path",{d:"m12 15 4 4"}]]];var Vu=["svg",t,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"m16 19 2 2 4-4"}]]];var Bu=["svg",t,[["path",{d:"M22 15V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M16 19h6"}]]];var Ru=["svg",t,[["path",{d:"M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"}],["path",{d:"m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"}]]];var Iu=["svg",t,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M19 16v6"}],["path",{d:"M16 19h6"}]]];var $u=["svg",t,[["path",{d:"M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M18 15.28c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"}],["path",{d:"M20 22v.01"}]]];var Ou=["svg",t,[["path",{d:"M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h7.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6v0Z"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.5-1.5"}]]];var Nu=["svg",t,[["path",{d:"M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M20 14v4"}],["path",{d:"M20 22v.01"}]]];var qu=["svg",t,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"m17 17 4 4"}],["path",{d:"m21 17-4 4"}]]];var Wu=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}]]];var Zu=["svg",t,[["path",{d:"M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"}],["polyline",{points:"15,9 18,9 18,11"}],["path",{d:"M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0"}],["line",{x1:"6",x2:"7",y1:"10",y2:"10"}]]];var Uu=["svg",t,[["rect",{width:"16",height:"13",x:"6",y:"4",rx:"2"}],["path",{d:"m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7"}],["path",{d:"M2 8v11c0 1.1.9 2 2 2h14"}]]];var Gu=["svg",t,[["path",{d:"M5.43 5.43A8.06 8.06 0 0 0 4 10c0 6 8 12 8 12a29.94 29.94 0 0 0 5-5"}],["path",{d:"M19.18 13.52A8.66 8.66 0 0 0 20 10a8 8 0 0 0-8-8 7.88 7.88 0 0 0-3.52.82"}],["path",{d:"M9.13 9.13A2.78 2.78 0 0 0 9 10a3 3 0 0 0 3 3 2.78 2.78 0 0 0 .87-.13"}],["path",{d:"M14.9 9.25a3 3 0 0 0-2.15-2.16"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var _u=["svg",t,[["path",{d:"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"}],["circle",{cx:"12",cy:"10",r:"3"}]]];var zu=["svg",t,[["path",{d:"M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M8.835 14H5a1 1 0 0 0-.9.7l-2 6c-.1.1-.1.2-.1.3 0 .6.4 1 1 1h18c.6 0 1-.4 1-1 0-.1 0-.2-.1-.3l-2-6a1 1 0 0 0-.9-.7h-3.835"}]]];var ju=["svg",t,[["polygon",{points:"3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"}],["line",{x1:"9",x2:"9",y1:"3",y2:"18"}],["line",{x1:"15",x2:"15",y1:"6",y2:"21"}]]];var Xu=["svg",t,[["path",{d:"M8 22h8"}],["path",{d:"M12 11v11"}],["path",{d:"m19 3-7 8-7-8Z"}]]];var Ku=["svg",t,[["polyline",{points:"15 3 21 3 21 9"}],["polyline",{points:"9 21 3 21 3 15"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14"}]]];var Yu=["svg",t,[["path",{d:"M8 3H5a2 2 0 0 0-2 2v3"}],["path",{d:"M21 8V5a2 2 0 0 0-2-2h-3"}],["path",{d:"M3 16v3a2 2 0 0 0 2 2h3"}],["path",{d:"M16 21h3a2 2 0 0 0 2-2v-3"}]]];var Ju=["svg",t,[["path",{d:"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"}],["path",{d:"M11 12 5.12 2.2"}],["path",{d:"m13 12 5.88-9.8"}],["path",{d:"M8 7h8"}],["circle",{cx:"12",cy:"17",r:"5"}],["path",{d:"M12 18v-2h-.5"}]]];var Qu=["svg",t,[["path",{d:"M9.26 9.26 3 11v3l14.14 3.14"}],["path",{d:"M21 15.34V6l-7.31 2.03"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var t0=["svg",t,[["path",{d:"m3 11 18-5v12L3 14v-3z"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6"}]]];var e0=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"8",x2:"16",y1:"15",y2:"15"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];var a0=["svg",t,[["path",{d:"M6 19v-3"}],["path",{d:"M10 19v-3"}],["path",{d:"M14 19v-3"}],["path",{d:"M18 19v-3"}],["path",{d:"M8 11V9"}],["path",{d:"M16 11V9"}],["path",{d:"M12 11V9"}],["path",{d:"M2 15h20"}],["path",{d:"M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"}]]];var r0=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 8h10"}],["path",{d:"M7 12h10"}],["path",{d:"M7 16h10"}]]];var o0=["svg",t,[["line",{x1:"4",x2:"20",y1:"12",y2:"12"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18"}]]];var s0=["svg",t,[["path",{d:"m8 6 4-4 4 4"}],["path",{d:"M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"}],["path",{d:"m20 22-5-5"}]]];var i0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"m10 10-2 2 2 2"}],["path",{d:"m14 10 2 2-2 2"}]]];var n0=["svg",t,[["path",{d:"M13.5 3.1c-.5 0-1-.1-1.5-.1s-1 .1-1.5.1"}],["path",{d:"M19.3 6.8a10.45 10.45 0 0 0-2.1-2.1"}],["path",{d:"M20.9 13.5c.1-.5.1-1 .1-1.5s-.1-1-.1-1.5"}],["path",{d:"M17.2 19.3a10.45 10.45 0 0 0 2.1-2.1"}],["path",{d:"M10.5 20.9c.5.1 1 .1 1.5.1s1-.1 1.5-.1"}],["path",{d:"M3.5 17.5 2 22l4.5-1.5"}],["path",{d:"M3.1 10.5c0 .5-.1 1-.1 1.5s.1 1 .1 1.5"}],["path",{d:"M6.8 4.7a10.45 10.45 0 0 0-2.1 2.1"}]]];var l0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M15.8 9.2a2.5 2.5 0 0 0-3.5 0l-.3.4-.35-.3a2.42 2.42 0 1 0-3.2 3.6l3.6 3.5 3.6-3.5c1.2-1.2 1.1-2.7.2-3.7"}]]];var d0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M8 12h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M16 12h.01"}]]];var c0=["svg",t,[["path",{d:"M20.5 14.9A9 9 0 0 0 9.1 3.5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"}]]];var p0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];var f0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];var h0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"m10 15-3-3 3-3"}],["path",{d:"M7 12h7a2 2 0 0 1 2 2v1"}]]];var u0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M12 8v4"}],["path",{d:"M12 16h.01"}]]];var m0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];var x0=["svg",t,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}]]];var g0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"m10 8-2 2 2 2"}],["path",{d:"m14 8 2 2-2 2"}]]];var v0=["svg",t,[["path",{d:"M3 6V5c0-1.1.9-2 2-2h2"}],["path",{d:"M11 3h3"}],["path",{d:"M18 3h1c1.1 0 2 .9 2 2"}],["path",{d:"M21 9v2"}],["path",{d:"M21 15c0 1.1-.9 2-2 2h-1"}],["path",{d:"M14 17h-3"}],["path",{d:"m7 17-4 4v-5"}],["path",{d:"M3 12v-2"}]]];var y0=["svg",t,[["path",{d:"m5 19-2 2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"}],["path",{d:"M9 10h6"}],["path",{d:"M12 7v6"}],["path",{d:"M9 17h6"}]]];var M0=["svg",t,[["path",{d:"M11.7 3H5a2 2 0 0 0-2 2v16l4-4h12a2 2 0 0 0 2-2v-2.7"}],["circle",{cx:"18",cy:"6",r:"3"}]]];var b0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M14.8 7.5a1.84 1.84 0 0 0-2.6 0l-.2.3-.3-.3a1.84 1.84 0 1 0-2.4 2.8L12 13l2.7-2.7c.9-.9.8-2.1.1-2.8"}]]];var S0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M8 10h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M16 10h.01"}]]];var A0=["svg",t,[["path",{d:"M21 15V5a2 2 0 0 0-2-2H9"}],["path",{d:"m2 2 20 20"}],["path",{d:"M3.6 3.6c-.4.3-.6.8-.6 1.4v16l4-4h10"}]]];var w0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M12 7v6"}],["path",{d:"M9 10h6"}]]];var C0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M8 12a2 2 0 0 0 2-2V8H8"}],["path",{d:"M14 12a2 2 0 0 0 2-2V8h-2"}]]];var L0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"m10 7-3 3 3 3"}],["path",{d:"M17 13v-1a2 2 0 0 0-2-2H7"}]]];var E0=["svg",t,[["path",{d:"M21 12v3a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h7"}],["path",{d:"M16 3h5v5"}],["path",{d:"m16 8 5-5"}]]];var k0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M13 8H7"}],["path",{d:"M17 12H7"}]]];var P0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M12 7v2"}],["path",{d:"M12 13h.01"}]]];var T0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"m14.5 7.5-5 5"}],["path",{d:"m9.5 7.5 5 5"}]]];var D0=["svg",t,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}]]];var H0=["svg",t,[["path",{d:"M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"}]]];var F0=["svg",t,[["path",{d:"m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"}],["circle",{cx:"17",cy:"7",r:"5"}]]];var V0=["svg",t,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}]]];var B0=["svg",t,[["path",{d:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}]]];var R0=["svg",t,[["path",{d:"M6 18h8"}],["path",{d:"M3 22h18"}],["path",{d:"M14 22a7 7 0 1 0 0-14h-1"}],["path",{d:"M9 14h2"}],["path",{d:"M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"}],["path",{d:"M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"}]]];var I0=["svg",t,[["rect",{width:"20",height:"15",x:"2",y:"4",rx:"2"}],["rect",{width:"8",height:"7",x:"6",y:"8",rx:"1"}],["path",{d:"M18 8v7"}],["path",{d:"M6 19v2"}],["path",{d:"M18 19v2"}]]];var $0=["svg",t,[["path",{d:"M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"}],["path",{d:"M12 13v8"}],["path",{d:"M12 3v3"}]]];var O0=["svg",t,[["path",{d:"M8 2h8"}],["path",{d:"M9 2v1.343M15 2v2.789a4 4 0 0 0 .672 2.219l.656.984a4 4 0 0 1 .672 2.22v1.131M7.8 7.8l-.128.192A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3"}],["path",{d:"M7 15a6.47 6.47 0 0 1 5 0 6.472 6.472 0 0 0 3.435.435"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var N0=["svg",t,[["path",{d:"M8 2h8"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0"}]]];var q0=["svg",t,[["polyline",{points:"4 14 10 14 10 20"}],["polyline",{points:"20 10 14 10 14 4"}],["line",{x1:"14",x2:"21",y1:"10",y2:"3"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14"}]]];var W0=["svg",t,[["path",{d:"M8 3v3a2 2 0 0 1-2 2H3"}],["path",{d:"M21 8h-3a2 2 0 0 1-2-2V3"}],["path",{d:"M3 16h3a2 2 0 0 1 2 2v3"}],["path",{d:"M16 21v-3a2 2 0 0 1 2-2h3"}]]];var Z0=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}]]];var U0=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}]]];var G0=["svg",t,[["path",{d:"M5 12h14"}]]];var _0=["svg",t,[["path",{d:"m9 10 2 2 4-4"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var z0=["svg",t,[["circle",{cx:"19",cy:"6",r:"3"}],["path",{d:"M22 12v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var j0=["svg",t,[["path",{d:"M12 13V7"}],["path",{d:"m15 10-3 3-3-3"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var X0=["svg",t,[["path",{d:"M17 17H4a2 2 0 0 1-2-2V5c0-1.5 1-2 1-2"}],["path",{d:"M22 15V5a2 2 0 0 0-2-2H9"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m2 2 20 20"}]]];var K0=["svg",t,[["path",{d:"M10 13V7"}],["path",{d:"M14 13V7"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var Y0=["svg",t,[["path",{d:"m10 7 5 3-5 3Z"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var J0=["svg",t,[["path",{d:"M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"}],["path",{d:"M10 19v-3.96 3.15"}],["path",{d:"M7 19h5"}],["rect",{width:"6",height:"10",x:"16",y:"12",rx:"2"}]]];var Q0=["svg",t,[["path",{d:"M5.5 20H8"}],["path",{d:"M17 9h.01"}],["rect",{width:"10",height:"16",x:"12",y:"4",rx:"2"}],["path",{d:"M8 6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4"}],["circle",{cx:"17",cy:"15",r:"1"}]]];var tm=["svg",t,[["rect",{x:"9",y:"7",width:"6",height:"6"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var em=["svg",t,[["path",{d:"m9 10 3-3 3 3"}],["path",{d:"M12 13V7"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var am=["svg",t,[["path",{d:"m14.5 12.5-5-5"}],["path",{d:"m9.5 12.5 5-5"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];var rm=["svg",t,[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21"}]]];var om=["svg",t,[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"}],["path",{d:"M19 3v4"}],["path",{d:"M21 5h-4"}]]];var sm=["svg",t,[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"}]]];var im=["svg",t,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]]];var nm=["svg",t,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"12",cy:"5",r:"1"}],["circle",{cx:"12",cy:"19",r:"1"}]]];var lm=["svg",t,[["path",{d:"m8 3 4 8 5-5 5 15H2L8 3z"}],["path",{d:"M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"}]]];var dm=["svg",t,[["path",{d:"m8 3 4 8 5-5 5 15H2L8 3z"}]]];var cm=["svg",t,[["path",{d:"m4 4 7.07 17 2.51-7.39L21 11.07z"}]]];var pm=["svg",t,[["path",{d:"m9 9 5 12 1.8-5.2L21 14Z"}],["path",{d:"M7.2 2.2 8 5.1"}],["path",{d:"m5.1 8-2.9-.8"}],["path",{d:"M14 4.1 12 6"}],["path",{d:"m6 12-1.9 2"}]]];var fm=["svg",t,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"m12 12 4 10 1.7-4.3L22 16Z"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h2"}],["path",{d:"M14 3h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v2"}],["path",{d:"M3 14v1"}]]];var Se=["svg",t,[["path",{d:"M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"}],["path",{d:"m12 12 4 10 1.7-4.3L22 16Z"}]]];var hm=["svg",t,[["path",{d:"m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"}],["path",{d:"m13 13 6 6"}]]];var um=["svg",t,[["rect",{x:"5",y:"2",width:"14",height:"20",rx:"7"}],["path",{d:"M12 6v4"}]]];var Ae=["svg",t,[["path",{d:"M5 3v16h16"}],["path",{d:"m5 19 6-6"}],["path",{d:"m2 6 3-3 3 3"}],["path",{d:"m18 16 3 3-3 3"}]]];var mm=["svg",t,[["polyline",{points:"5 11 5 5 11 5"}],["polyline",{points:"19 13 19 19 13 19"}],["line",{x1:"5",x2:"19",y1:"5",y2:"19"}]]];var xm=["svg",t,[["polyline",{points:"13 5 19 5 19 11"}],["polyline",{points:"11 19 5 19 5 13"}],["line",{x1:"19",x2:"5",y1:"5",y2:"19"}]]];var gm=["svg",t,[["path",{d:"M11 19H5V13"}],["path",{d:"M19 5L5 19"}]]];var vm=["svg",t,[["path",{d:"M19 13V19H13"}],["path",{d:"M5 5L19 19"}]]];var ym=["svg",t,[["path",{d:"M8 18L12 22L16 18"}],["path",{d:"M12 2V22"}]]];var Mm=["svg",t,[["polyline",{points:"18 8 22 12 18 16"}],["polyline",{points:"6 8 2 12 6 16"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}]]];var bm=["svg",t,[["path",{d:"M6 8L2 12L6 16"}],["path",{d:"M2 12H22"}]]];var Sm=["svg",t,[["path",{d:"M18 8L22 12L18 16"}],["path",{d:"M2 12H22"}]]];var Am=["svg",t,[["path",{d:"M5 11V5H11"}],["path",{d:"M5 5L19 19"}]]];var wm=["svg",t,[["path",{d:"M13 5H19V11"}],["path",{d:"M19 5L5 19"}]]];var Cm=["svg",t,[["path",{d:"M8 6L12 2L16 6"}],["path",{d:"M12 2V22"}]]];var Lm=["svg",t,[["polyline",{points:"8 18 12 22 16 18"}],["polyline",{points:"8 6 12 2 16 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}]]];var Em=["svg",t,[["polyline",{points:"5 9 2 12 5 15"}],["polyline",{points:"9 5 12 2 15 5"}],["polyline",{points:"15 19 12 22 9 19"}],["polyline",{points:"19 9 22 12 19 15"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}]]];var km=["svg",t,[["circle",{cx:"8",cy:"18",r:"4"}],["path",{d:"M12 18V2l7 4"}]]];var Pm=["svg",t,[["circle",{cx:"12",cy:"18",r:"4"}],["path",{d:"M16 18V2"}]]];var Tm=["svg",t,[["path",{d:"M9 18V5l12-2v13"}],["path",{d:"m9 9 12-2"}],["circle",{cx:"6",cy:"18",r:"3"}],["circle",{cx:"18",cy:"16",r:"3"}]]];var Dm=["svg",t,[["path",{d:"M9 18V5l12-2v13"}],["circle",{cx:"6",cy:"18",r:"3"}],["circle",{cx:"18",cy:"16",r:"3"}]]];var Hm=["svg",t,[["path",{d:"M9.31 9.31 5 21l7-4 7 4-1.17-3.17"}],["path",{d:"M14.53 8.88 12 2l-1.17 3.17"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Fm=["svg",t,[["polygon",{points:"12 2 19 21 12 17 5 21 12 2"}]]];var Vm=["svg",t,[["path",{d:"M8.43 8.43 3 11l8 2 2 8 2.57-5.43"}],["path",{d:"M17.39 11.73 22 2l-9.73 4.61"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var Bm=["svg",t,[["polygon",{points:"3 11 22 2 13 21 11 13 3 11"}]]];var Rm=["svg",t,[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"}],["path",{d:"M12 12V8"}]]];var Im=["svg",t,[["path",{d:"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"}],["path",{d:"M18 14h-8"}],["path",{d:"M15 18h-5"}],["path",{d:"M10 6h8v4h-8V6Z"}]]];var $m=["svg",t,[["path",{d:"M6 8.32a7.43 7.43 0 0 1 0 7.36"}],["path",{d:"M9.46 6.21a11.76 11.76 0 0 1 0 11.58"}],["path",{d:"M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"}],["path",{d:"M16.37 2a20.16 20.16 0 0 1 0 20"}]]];var Om=["svg",t,[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"}],["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["path",{d:"M18.4 2.6a2.17 2.17 0 0 1 3 3L16 11l-4 1 1-4Z"}]]];var Nm=["svg",t,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M15 2v20"}],["path",{d:"M15 7h5"}],["path",{d:"M15 12h5"}],["path",{d:"M15 17h5"}]]];var qm=["svg",t,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M9.5 8h5"}],["path",{d:"M9.5 12H16"}],["path",{d:"M9.5 16H14"}]]];var Wm=["svg",t,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M16 2v20"}]]];var Zm=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M12 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v2"}],["path",{d:"M20 12v2"}],["path",{d:"M20 18v2a2 2 0 0 1-2 2h-1"}],["path",{d:"M13 22h-2"}],["path",{d:"M7 22H6a2 2 0 0 1-2-2v-2"}],["path",{d:"M4 14v-2"}],["path",{d:"M4 8V6a2 2 0 0 1 2-2h2"}],["path",{d:"M8 10h6"}],["path",{d:"M8 14h8"}],["path",{d:"M8 18h5"}]]];var Um=["svg",t,[["path",{d:"M8 2v4"}],["path",{d:"M12 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"16",height:"18",x:"4",y:"4",rx:"2"}],["path",{d:"M8 10h6"}],["path",{d:"M8 14h8"}],["path",{d:"M8 18h5"}]]];var Gm=["svg",t,[["path",{d:"M12 4V2"}],["path",{d:"M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592a7.01 7.01 0 0 0 4.125-2.939"}],["path",{d:"M19 10v3.343"}],["path",{d:"M12 12c-1.349-.573-1.905-1.005-2.5-2-.546.902-1.048 1.353-2.5 2-1.018-.644-1.46-1.08-2-2-1.028.71-1.69.918-3 1 1.081-1.048 1.757-2.03 2-3 .194-.776.84-1.551 1.79-2.21m11.654 5.997c.887-.457 1.28-.891 1.556-1.787 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4-.74 0-1.461.068-2.15.192"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var _m=["svg",t,[["path",{d:"M12 4V2"}],["path",{d:"M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4"}],["path",{d:"M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z"}]]];var zm=["svg",t,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}]]];var jm=["svg",t,[["path",{d:"M3 3h6l6 18h6"}],["path",{d:"M14 3h7"}]]];var Xm=["svg",t,[["circle",{cx:"12",cy:"12",r:"3"}],["circle",{cx:"19",cy:"5",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M10.4 21.9a10 10 0 0 0 9.941-15.416"}],["path",{d:"M13.5 2.1a10 10 0 0 0-9.841 15.416"}]]];var Km=["svg",t,[["polyline",{points:"7 8 3 12 7 16"}],["line",{x1:"21",x2:"11",y1:"12",y2:"12"}],["line",{x1:"21",x2:"11",y1:"6",y2:"6"}],["line",{x1:"21",x2:"11",y1:"18",y2:"18"}]]];var Ym=["svg",t,[["path",{d:"M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"}],["path",{d:"m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"}],["path",{d:"M12 3v6"}]]];var Jm=["svg",t,[["path",{d:"m16 16 2 2 4-4"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];var Qm=["svg",t,[["path",{d:"M16 16h6"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];var tx=["svg",t,[["path",{d:"M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"}],["path",{d:"m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"}],["line",{x1:"12",x2:"12",y1:"22",y2:"13"}],["path",{d:"M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"}]]];var ex=["svg",t,[["path",{d:"M16 16h6"}],["path",{d:"M19 13v6"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];var ax=["svg",t,[["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}],["circle",{cx:"18.5",cy:"15.5",r:"2.5"}],["path",{d:"M20.27 17.27 22 19"}]]];var rx=["svg",t,[["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}],["path",{d:"m17 13 5 5m-5 0 5-5"}]]];var ox=["svg",t,[["path",{d:"m7.5 4.27 9 5.15"}],["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"}],["path",{d:"m3.3 7 8.7 5 8.7-5"}],["path",{d:"M12 22V12"}]]];var sx=["svg",t,[["path",{d:"m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"}],["path",{d:"m5 2 5 5"}],["path",{d:"M2 13h15"}],["path",{d:"M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"}]]];var ix=["svg",t,[["rect",{width:"16",height:"6",x:"2",y:"2",rx:"2"}],["path",{d:"M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"}],["rect",{width:"4",height:"6",x:"8",y:"16",rx:"1"}]]];var nx=["svg",t,[["path",{d:"M14 19.9V16h3a2 2 0 0 0 2-2v-2H5v2c0 1.1.9 2 2 2h3v3.9a2 2 0 1 0 4 0Z"}],["path",{d:"M6 12V2h12v10"}],["path",{d:"M14 2v4"}],["path",{d:"M10 2v2"}]]];var lx=["svg",t,[["path",{d:"M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"}],["path",{d:"M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"}],["path",{d:"M14.5 17.5 4.5 15"}]]];var dx=["svg",t,[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"}]]];var cx=["svg",t,[["path",{d:"M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"}],["path",{d:"M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"}],["path",{d:"M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z"}],["path",{d:"M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"}]]];var px=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}],["path",{d:"m15 8-3 3-3-3"}]]];var we=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M14 15h1"}],["path",{d:"M19 15h2"}],["path",{d:"M3 15h2"}],["path",{d:"M9 15h1"}]]];var fx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}],["path",{d:"m9 10 3-3 3 3"}]]];var hx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}]]];var Ce=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"m16 15-3-3 3-3"}]]];var Le=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 14v1"}],["path",{d:"M9 19v2"}],["path",{d:"M9 3v2"}],["path",{d:"M9 9v1"}]]];var Ee=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"m14 9 3 3-3 3"}]]];var ke=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}]]];var ux=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}],["path",{d:"m8 9 3 3-3 3"}]]];var Pe=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 14v1"}],["path",{d:"M15 19v2"}],["path",{d:"M15 3v2"}],["path",{d:"M15 9v1"}]]];var mx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}],["path",{d:"m10 15-3-3 3-3"}]]];var xx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}]]];var gx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"m9 16 3-3 3 3"}]]];var Te=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M14 9h1"}],["path",{d:"M19 9h2"}],["path",{d:"M3 9h2"}],["path",{d:"M9 9h1"}]]];var vx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"m15 14-3 3-3-3"}]]];var yx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}]]];var Mx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"M9 15h12"}]]];var bx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h12"}],["path",{d:"M15 3v18"}]]];var De=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M9 21V9"}]]];var Sx=["svg",t,[["path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"}]]];var Ax=["svg",t,[["path",{d:"M8 21s-4-3-4-9 4-9 4-9"}],["path",{d:"M16 3s4 3 4 9-4 9-4 9"}]]];var wx=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m5 5 14 14"}],["path",{d:"M13 13a3 3 0 1 0 0-6H9v2"}],["path",{d:"M9 17v-2.34"}]]];var Cx=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9 17V7h4a3 3 0 0 1 0 6H9"}]]];var Lx=["svg",t,[["path",{d:"M9 9a3 3 0 1 1 6 0"}],["path",{d:"M12 12v3"}],["path",{d:"M11 15h2"}],["path",{d:"M19 9a7 7 0 1 0-13.6 2.3C6.4 14.4 8 19 8 19h8s1.6-4.6 2.6-7.7c.3-.8.4-1.5.4-2.3"}],["path",{d:"M12 19v3"}]]];var Ex=["svg",t,[["path",{d:"M3.6 3.6A2 2 0 0 1 5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-.59 1.41"}],["path",{d:"M3 8.7V19a2 2 0 0 0 2 2h10.3"}],["path",{d:"m2 2 20 20"}],["path",{d:"M13 13a3 3 0 1 0 0-6H9v2"}],["path",{d:"M9 17v-2.3"}]]];var kx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 17V7h4a3 3 0 0 1 0 6H9"}]]];var Px=["svg",t,[["path",{d:"M5.8 11.3 2 22l10.7-3.79"}],["path",{d:"M4 3h.01"}],["path",{d:"M22 8h.01"}],["path",{d:"M15 2h.01"}],["path",{d:"M22 20h.01"}],["path",{d:"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"}],["path",{d:"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"}],["path",{d:"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"}],["path",{d:"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"}]]];var Tx=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9"}]]];var Dx=["svg",t,[["path",{d:"M10 15V9"}],["path",{d:"M14 15V9"}],["path",{d:"M7.714 2h8.572L22 7.714v8.572L16.286 22H7.714L2 16.286V7.714L7.714 2z"}]]];var Hx=["svg",t,[["rect",{width:"4",height:"16",x:"6",y:"4"}],["rect",{width:"4",height:"16",x:"14",y:"4"}]]];var Fx=["svg",t,[["circle",{cx:"11",cy:"4",r:"2"}],["circle",{cx:"18",cy:"8",r:"2"}],["circle",{cx:"20",cy:"16",r:"2"}],["path",{d:"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"}]]];var Vx=["svg",t,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2"}],["path",{d:"M15 14h.01"}],["path",{d:"M9 6h6"}],["path",{d:"M9 10h6"}]]];var He=["svg",t,[["path",{d:"M12 20h9"}],["path",{d:"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"}]]];var Bx=["svg",t,[["path",{d:"m12 19 7-7 3 3-7 7-3-3z"}],["path",{d:"m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"}],["path",{d:"m2 2 7.586 7.586"}],["circle",{cx:"11",cy:"11",r:"2"}]]];var Fe=["svg",t,[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"}]]];var Rx=["svg",t,[["path",{d:"M12 20h9"}],["path",{d:"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"}],["path",{d:"m15 5 3 3"}]]];var Ix=["svg",t,[["path",{d:"m15 5 4 4"}],["path",{d:"M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"}],["path",{d:"m8 6 2-2"}],["path",{d:"m2 22 5.5-1.5L21.17 6.83a2.82 2.82 0 0 0-4-4L3.5 16.5Z"}],["path",{d:"m18 16 2-2"}],["path",{d:"m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17"}]]];var $x=["svg",t,[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"}],["path",{d:"m15 5 4 4"}]]];var Ox=["svg",t,[["path",{d:"M3.5 8.7c-.7.5-1 1.4-.7 2.2l2.8 8.7c.3.8 1 1.4 1.9 1.4h9.1c.9 0 1.6-.6 1.9-1.4l2.8-8.7c.3-.8 0-1.7-.7-2.2l-7.4-5.3a2.1 2.1 0 0 0-2.4 0Z"}]]];var Nx=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];var qx=["svg",t,[["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0Z"}],["path",{d:"M9.2 9.2h.01"}],["path",{d:"m14.5 9.5-5 5"}],["path",{d:"M14.7 14.8h.01"}]]];var Wx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];var Zx=["svg",t,[["line",{x1:"19",x2:"5",y1:"5",y2:"19"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5"}]]];var Ux=["svg",t,[["circle",{cx:"12",cy:"5",r:"1"}],["path",{d:"m9 20 3-6 3 6"}],["path",{d:"m6 8 6 2 6-2"}],["path",{d:"M12 10v4"}]]];var Gx=["svg",t,[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10"}]]];var _x=["svg",t,[["polyline",{points:"18 2 22 6 18 10"}],["line",{x1:"14",x2:"22",y1:"6",y2:"6"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];var zx=["svg",t,[["polyline",{points:"16 2 16 8 22 8"}],["line",{x1:"22",x2:"16",y1:"2",y2:"8"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];var jx=["svg",t,[["line",{x1:"22",x2:"16",y1:"2",y2:"8"}],["line",{x1:"16",x2:"22",y1:"2",y2:"8"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];var Xx=["svg",t,[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22"}]]];var Kx=["svg",t,[["polyline",{points:"22 8 22 2 16 2"}],["line",{x1:"16",x2:"22",y1:"8",y2:"2"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];var Yx=["svg",t,[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];var Jx=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7h10"}],["path",{d:"M10 7v10"}],["path",{d:"M16 17a2 2 0 0 1-2-2V7"}]]];var Qx=["svg",t,[["line",{x1:"9",x2:"9",y1:"4",y2:"20"}],["path",{d:"M4 7c0-1.7 1.3-3 3-3h13"}],["path",{d:"M18 20c-1.7 0-3-1.3-3-3V4"}]]];var tg=["svg",t,[["path",{d:"M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8"}],["path",{d:"M2 14h20"}],["path",{d:"M6 14v4"}],["path",{d:"M10 14v4"}],["path",{d:"M14 14v4"}],["path",{d:"M18 14v4"}]]];var eg=["svg",t,[["path",{d:"M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912"}],["path",{d:"M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393"}],["path",{d:"M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"}],["path",{d:"M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319"}]]];var ag=["svg",t,[["path",{d:"M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"}],["rect",{width:"10",height:"7",x:"12",y:"13",rx:"2"}]]];var rg=["svg",t,[["path",{d:"M8 4.5v5H3m-1-6 6 6m13 0v-3c0-1.16-.84-2-2-2h-7m-9 9v2c0 1.05.95 2 2 2h3"}],["rect",{width:"10",height:"7",x:"12",y:"13.5",ry:"2"}]]];var og=["svg",t,[["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83"}],["path",{d:"M22 12A10 10 0 0 0 12 2v10z"}]]];var sg=["svg",t,[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1"}],["path",{d:"M16 11h0"}]]];var ig=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 12H9.5a2.5 2.5 0 0 1 0-5H17"}],["path",{d:"M12 7v10"}],["path",{d:"M16 7v10"}]]];var ng=["svg",t,[["path",{d:"M13 4v16"}],["path",{d:"M17 4v16"}],["path",{d:"M19 4H9.5a4.5 4.5 0 0 0 0 9H13"}]]];var lg=["svg",t,[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"}],["path",{d:"m8.5 8.5 7 7"}]]];var dg=["svg",t,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["line",{x1:"12",x2:"12",y1:"17",y2:"22"}],["path",{d:"M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"}],["path",{d:"M15 9.34V6h1a2 2 0 0 0 0-4H7.89"}]]];var cg=["svg",t,[["line",{x1:"12",x2:"12",y1:"17",y2:"22"}],["path",{d:"M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"}]]];var pg=["svg",t,[["path",{d:"m2 22 1-1h3l9-9"}],["path",{d:"M3 21v-3l9-9"}],["path",{d:"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"}]]];var fg=["svg",t,[["path",{d:"M15 11h.01"}],["path",{d:"M11 15h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"m2 16 20 6-6-20A20 20 0 0 0 2 16"}],["path",{d:"M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"}]]];var hg=["svg",t,[["path",{d:"M2 22h20"}],["path",{d:"M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"}]]];var ug=["svg",t,[["path",{d:"M2 22h20"}],["path",{d:"M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"}]]];var mg=["svg",t,[["path",{d:"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"}]]];var xg=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["polygon",{points:"10 8 16 12 10 16 10 8"}]]];var gg=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m9 8 6 4-6 4Z"}]]];var vg=["svg",t,[["polygon",{points:"5 3 19 12 5 21 5 3"}]]];var yg=["svg",t,[["path",{d:"M9 2v6"}],["path",{d:"M15 2v6"}],["path",{d:"M12 17v5"}],["path",{d:"M5 8h14"}],["path",{d:"M6 11V8h12v3a6 6 0 1 1-12 0v0Z"}]]];var Mg=["svg",t,[["path",{d:"m13 2-2 2.5h3L12 7"}],["path",{d:"M10 14v-3"}],["path",{d:"M14 14v-3"}],["path",{d:"M11 19c-1.7 0-3-1.3-3-3v-2h8v2c0 1.7-1.3 3-3 3Z"}],["path",{d:"M12 22v-3"}]]];var bg=["svg",t,[["path",{d:"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"}],["path",{d:"m2 22 3-3"}],["path",{d:"M7.5 13.5 10 11"}],["path",{d:"M10.5 16.5 13 14"}],["path",{d:"m18 3-4 4h6l-4 4"}]]];var Sg=["svg",t,[["path",{d:"M12 22v-5"}],["path",{d:"M9 8V2"}],["path",{d:"M15 8V2"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"}]]];var Ag=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];var wg=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];var Cg=["svg",t,[["path",{d:"M5 12h14"}],["path",{d:"M12 5v14"}]]];var Lg=["svg",t,[["path",{d:"M3 2v1c0 1 2 1 2 2S3 6 3 7s2 1 2 2-2 1-2 2 2 1 2 2"}],["path",{d:"M18 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"M20.83 8.83a4 4 0 0 0-5.66-5.66l-12 12a4 4 0 1 0 5.66 5.66Z"}],["path",{d:"M18 11.66V22a4 4 0 0 0 4-4V6"}]]];var Eg=["svg",t,[["path",{d:"M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"}],["polyline",{points:"8 10 12 14 16 10"}]]];var kg=["svg",t,[["circle",{cx:"12",cy:"11",r:"1"}],["path",{d:"M11 17a1 1 0 0 1 2 0c0 .5-.34 3-.5 4.5a.5.5 0 0 1-1 0c-.16-1.5-.5-4-.5-4.5Z"}],["path",{d:"M8 14a5 5 0 1 1 8 0"}],["path",{d:"M17 18.5a9 9 0 1 0-10 0"}]]];var Pg=["svg",t,[["path",{d:"M10 4.5V4a2 2 0 0 0-2.41-1.957"}],["path",{d:"M13.9 8.4a2 2 0 0 0-1.26-1.295"}],["path",{d:"M21.7 16.2A8 8 0 0 0 22 14v-3a2 2 0 1 0-4 0v-1a2 2 0 0 0-3.63-1.158"}],["path",{d:"m7 15-1.8-1.8a2 2 0 0 0-2.79 2.86L6 19.7a7.74 7.74 0 0 0 6 2.3h2a8 8 0 0 0 5.657-2.343"}],["path",{d:"M6 6v8"}],["path",{d:"m2 2 20 20"}]]];var Tg=["svg",t,[["path",{d:"M22 14a8 8 0 0 1-8 8"}],["path",{d:"M18 11v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M14 10V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"}],["path",{d:"M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10"}],["path",{d:"M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]]];var Dg=["svg",t,[["path",{d:"M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4"}],["path",{d:"M10 22 9 8"}],["path",{d:"m14 22 1-14"}],["path",{d:"M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z"}]]];var Hg=["svg",t,[["path",{d:"M18.6 14.4c.8-.8.8-2 0-2.8l-8.1-8.1a4.95 4.95 0 1 0-7.1 7.1l8.1 8.1c.9.7 2.1.7 2.9-.1Z"}],["path",{d:"m22 22-5.5-5.5"}]]];var Fg=["svg",t,[["path",{d:"M18 7c0-5.333-8-5.333-8 0"}],["path",{d:"M10 7v14"}],["path",{d:"M6 21h12"}],["path",{d:"M6 13h10"}]]];var Vg=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 12V6"}],["path",{d:"M8 7.5A6.1 6.1 0 0 0 12 18a6 6 0 0 0 4-10.5"}]]];var Bg=["svg",t,[["path",{d:"M18.36 6.64A9 9 0 0 1 20.77 15"}],["path",{d:"M6.16 6.16a9 9 0 1 0 12.68 12.68"}],["path",{d:"M12 2v4"}],["path",{d:"m2 2 20 20"}]]];var Rg=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 7v5"}],["path",{d:"M8 9a5.14 5.14 0 0 0 4 8 4.95 4.95 0 0 0 4-8"}]]];var Ig=["svg",t,[["path",{d:"M12 2v10"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04"}]]];var $g=["svg",t,[["path",{d:"M2 3h20"}],["path",{d:"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"}],["path",{d:"m7 21 5-5 5 5"}]]];var Og=["svg",t,[["polyline",{points:"6 9 6 2 18 2 18 9"}],["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}],["rect",{width:"12",height:"8",x:"6",y:"14"}]]];var Ng=["svg",t,[["path",{d:"M5 7 3 5"}],["path",{d:"M9 6V3"}],["path",{d:"m13 7 2-2"}],["circle",{cx:"9",cy:"13",r:"3"}],["path",{d:"M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17"}],["path",{d:"M16 16h2"}]]];var qg=["svg",t,[["path",{d:"M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"}]]];var Wg=["svg",t,[["path",{d:"M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"}],["path",{d:"M12 2v20"}]]];var Zg=["svg",t,[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3"}],["path",{d:"M21 21v.01"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7"}],["path",{d:"M3 12h.01"}],["path",{d:"M12 3h.01"}],["path",{d:"M12 16v.01"}],["path",{d:"M16 12h1"}],["path",{d:"M21 12v.01"}],["path",{d:"M12 21v-1"}]]];var Ug=["svg",t,[["path",{d:"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"}],["path",{d:"M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"}]]];var Gg=["svg",t,[["path",{d:"M13 16a3 3 0 0 1 2.24 5"}],["path",{d:"M18 12h.01"}],["path",{d:"M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"}],["path",{d:"M20 8.54V4a2 2 0 1 0-4 0v3"}],["path",{d:"M7.612 12.524a3 3 0 1 0-1.6 4.3"}]]];var _g=["svg",t,[["path",{d:"M19.07 4.93A10 10 0 0 0 6.99 3.34"}],["path",{d:"M4 6h.01"}],["path",{d:"M2.29 9.62A10 10 0 1 0 21.31 8.35"}],["path",{d:"M16.24 7.76A6 6 0 1 0 8.23 16.67"}],["path",{d:"M12 18h.01"}],["path",{d:"M17.99 11.66A6 6 0 0 1 15.77 16.67"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"m13.41 10.59 5.66-5.66"}]]];var zg=["svg",t,[["path",{d:"M12 12h0.01"}],["path",{d:"M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2.3 8.1 2 11c-.1.5.4 1 1 1h5c0-1.5.8-2.8 2-3.4-1.1-1.9-2-3.5-2.5-4.4z"}],["path",{d:"M21 12c.6 0 1-.4 1-1-.3-2.9-1.8-5.5-4.1-7.1-.4-.3-1.1-.2-1.3.3-.6.9-1.5 2.5-2.6 4.3 1.2.7 2 2 2 3.5h5z"}],["path",{d:"M7.5 19.8c-.3.5-.1 1.1.4 1.3 2.6 1.2 5.6 1.2 8.2 0 .5-.2.7-.8.4-1.3-.5-.9-1.4-2.5-2.5-4.3-1.2.7-2.8.7-4 0-1.1 1.8-2 3.4-2.5 4.3z"}]]];var jg=["svg",t,[["path",{d:"M3 12h4l3 9 4-17h7"}]]];var Xg=["svg",t,[["path",{d:"M5 16v2"}],["path",{d:"M19 16v2"}],["rect",{width:"20",height:"8",x:"2",y:"8",rx:"2"}],["path",{d:"M18 12h0"}]]];var Kg=["svg",t,[["path",{d:"M4.9 16.1C1 12.2 1 5.8 4.9 1.9"}],["path",{d:"M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"}],["circle",{cx:"12",cy:"9",r:"2"}],["path",{d:"M16.2 4.8c2 2 2.26 5.11.8 7.47"}],["path",{d:"M19.1 1.9a9.96 9.96 0 0 1 0 14.1"}],["path",{d:"M9.5 18h5"}],["path",{d:"m8 22 4-11 4 11"}]]];var Yg=["svg",t,[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19"}]]];var Jg=["svg",t,[["path",{d:"M20.34 17.52a10 10 0 1 0-2.82 2.82"}],["circle",{cx:"19",cy:"19",r:"2"}],["path",{d:"m13.41 13.41 4.18 4.18"}],["circle",{cx:"12",cy:"12",r:"2"}]]];var Qg=["svg",t,[["path",{d:"M5 15h14"}],["path",{d:"M5 9h14"}],["path",{d:"m14 20-5-5 6-6-5-5"}]]];var tv=["svg",t,[["path",{d:"M22 17a10 10 0 0 0-20 0"}],["path",{d:"M6 17a6 6 0 0 1 12 0"}],["path",{d:"M10 17a2 2 0 0 1 4 0"}]]];var ev=["svg",t,[["path",{d:"M17 5c0-1.7-1.3-3-3-3s-3 1.3-3 3c0 .8.3 1.5.8 2H11c-3.9 0-7 3.1-7 7v0c0 2.2 1.8 4 4 4"}],["path",{d:"M16.8 3.9c.3-.3.6-.5 1-.7 1.5-.6 3.3.1 3.9 1.6.6 1.5-.1 3.3-1.6 3.9l1.6 2.8c.2.3.2.7.2 1-.2.8-.9 1.2-1.7 1.1 0 0-1.6-.3-2.7-.6H17c-1.7 0-3 1.3-3 3"}],["path",{d:"M13.2 18a3 3 0 0 0-2.2-5"}],["path",{d:"M13 22H4a2 2 0 0 1 0-4h12"}],["path",{d:"M16 9h.01"}]]];var av=["svg",t,[["rect",{width:"12",height:"20",x:"6",y:"2",rx:"2"}],["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];var rv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M12 6.5v11"}],["path",{d:"M15 9.4a4 4 0 1 0 0 5.2"}]]];var ov=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 12h5"}],["path",{d:"M16 9.5a4 4 0 1 0 0 5.2"}]]];var sv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 7h8"}],["path",{d:"M12 17.5 8 15h1a4 4 0 0 0 0-8"}],["path",{d:"M8 11h8"}]]];var iv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"m12 10 3-3"}],["path",{d:"m9 7 3 3v7.5"}],["path",{d:"M9 11h6"}],["path",{d:"M9 15h6"}]]];var nv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 13h5"}],["path",{d:"M10 17V9.5a2.5 2.5 0 0 1 5 0"}],["path",{d:"M8 17h7"}]]];var lv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 15h5"}],["path",{d:"M8 11h5a2 2 0 1 0 0-4h-3v10"}]]];var dv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M10 17V7h5"}],["path",{d:"M10 11h4"}],["path",{d:"M8 15h5"}]]];var cv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M14 8H8"}],["path",{d:"M16 12H8"}],["path",{d:"M13 16H8"}]]];var pv=["svg",t,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 17.5v-11"}]]];var fv=["svg",t,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];var hv=["svg",t,[["rect",{width:"12",height:"20",x:"6",y:"2",rx:"2"}]]];var uv=["svg",t,[["path",{d:"M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"}],["path",{d:"M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"}],["path",{d:"m14 16-3 3 3 3"}],["path",{d:"M8.293 13.596 7.196 9.5 3.1 10.598"}],["path",{d:"m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"}],["path",{d:"m13.378 9.633 4.096 1.098 1.097-4.096"}]]];var mv=["svg",t,[["path",{d:"m15 14 5-5-5-5"}],["path",{d:"M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"}]]];var xv=["svg",t,[["circle",{cx:"12",cy:"17",r:"1"}],["path",{d:"M21 7v6h-6"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"}]]];var gv=["svg",t,[["path",{d:"M21 7v6h-6"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"}]]];var vv=["svg",t,[["path",{d:"M3 2v6h6"}],["path",{d:"M21 12A9 9 0 0 0 6 5.3L3 8"}],["path",{d:"M21 22v-6h-6"}],["path",{d:"M3 12a9 9 0 0 0 15 6.7l3-2.7"}],["circle",{cx:"12",cy:"12",r:"1"}]]];var yv=["svg",t,[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"}],["path",{d:"M16 16h5v5"}]]];var Mv=["svg",t,[["path",{d:"M21 8L18.74 5.74A9.75 9.75 0 0 0 12 3C11 3 10.03 3.16 9.13 3.47"}],["path",{d:"M8 16H3v5"}],["path",{d:"M3 12C3 9.51 4 7.26 5.64 5.64"}],["path",{d:"m3 16 2.26 2.26A9.75 9.75 0 0 0 12 21c2.49 0 4.74-1 6.36-2.64"}],["path",{d:"M21 12c0 1-.16 1.97-.47 2.87"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M22 22 2 2"}]]];var bv=["svg",t,[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"}],["path",{d:"M8 16H3v5"}]]];var Sv=["svg",t,[["path",{d:"M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"}],["path",{d:"M5 10h14"}],["path",{d:"M15 7v6"}]]];var Av=["svg",t,[["path",{d:"M17 3v10"}],["path",{d:"m12.67 5.5 8.66 5"}],["path",{d:"m12.67 10.5 8.66-5"}],["path",{d:"M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z"}]]];var wv=["svg",t,[["path",{d:"M4 7V4h16v3"}],["path",{d:"M5 20h6"}],["path",{d:"M13 4 8 20"}],["path",{d:"m15 15 5 5"}],["path",{d:"m20 15-5 5"}]]];var Cv=["svg",t,[["path",{d:"m17 2 4 4-4 4"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14"}],["path",{d:"m7 22-4-4 4-4"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3"}],["path",{d:"M11 10h1v4"}]]];var Lv=["svg",t,[["path",{d:"m2 9 3-3 3 3"}],["path",{d:"M13 18H7a2 2 0 0 1-2-2V6"}],["path",{d:"m22 15-3 3-3-3"}],["path",{d:"M11 6h6a2 2 0 0 1 2 2v10"}]]];var Ev=["svg",t,[["path",{d:"m17 2 4 4-4 4"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14"}],["path",{d:"m7 22-4-4 4-4"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3"}]]];var kv=["svg",t,[["path",{d:"M14 4c0-1.1.9-2 2-2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2"}],["path",{d:"M22 8c0 1.1-.9 2-2 2"}],["path",{d:"M16 10c-1.1 0-2-.9-2-2"}],["path",{d:"m3 7 3 3 3-3"}],["path",{d:"M6 10V5c0-1.7 1.3-3 3-3h1"}],["rect",{width:"8",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M14 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M20 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}]]];var Pv=["svg",t,[["path",{d:"M14 4c0-1.1.9-2 2-2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2"}],["path",{d:"M22 8c0 1.1-.9 2-2 2"}],["path",{d:"M16 10c-1.1 0-2-.9-2-2"}],["path",{d:"m3 7 3 3 3-3"}],["path",{d:"M6 10V5c0-1.7 1.3-3 3-3h1"}],["rect",{width:"8",height:"8",x:"2",y:"14",rx:"2"}]]];var Tv=["svg",t,[["polyline",{points:"7 17 2 12 7 7"}],["polyline",{points:"12 17 7 12 12 7"}],["path",{d:"M22 18v-2a4 4 0 0 0-4-4H7"}]]];var Dv=["svg",t,[["polyline",{points:"9 17 4 12 9 7"}],["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4"}]]];var Hv=["svg",t,[["polygon",{points:"11 19 2 12 11 5 11 19"}],["polygon",{points:"22 19 13 12 22 5 22 19"}]]];var Fv=["svg",t,[["path",{d:"M17.75 9.01c-.52 2.08-1.83 3.64-3.18 5.49l-2.6 3.54-2.97 4-3.5-2.54 3.85-4.97c-1.86-2.61-2.8-3.77-3.16-5.44"}],["path",{d:"M17.75 9.01A7 7 0 0 0 6.2 9.1C6.06 8.5 6 7.82 6 7c0-3.5 2.83-5 5.98-5C15.24 2 18 3.5 18 7c0 .73-.09 1.4-.25 2.01Z"}],["path",{d:"m9.35 14.53 2.64-3.31"}],["path",{d:"m11.97 18.04 2.99 4 3.54-2.54-3.93-5"}],["path",{d:"M14 8c0 1-1 2-2.01 3.22C11 10 10 9 10 8a2 2 0 1 1 4 0"}]]];var Vv=["svg",t,[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"}]]];var Bv=["svg",t,[["polyline",{points:"3.5 2 6.5 12.5 18 12.5"}],["line",{x1:"9.5",x2:"5.5",y1:"12.5",y2:"20"}],["line",{x1:"15",x2:"18.5",y1:"12.5",y2:"20"}],["path",{d:"M2.75 18a13 13 0 0 0 18.5 0"}]]];var Rv=["svg",t,[["path",{d:"M6 19V5"}],["path",{d:"M10 19V6.8"}],["path",{d:"M14 19v-7.8"}],["path",{d:"M18 5v4"}],["path",{d:"M18 19v-6"}],["path",{d:"M22 19V9"}],["path",{d:"M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"}]]];var Ve=["svg",t,[["path",{d:"M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2"}],["path",{d:"m15.194 13.707 3.814 1.86-1.86 3.814"}],["path",{d:"M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4"}]]];var Iv=["svg",t,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]]];var $v=["svg",t,[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"}],["path",{d:"M21 3v5h-5"}]]];var Ov=["svg",t,[["circle",{cx:"6",cy:"19",r:"3"}],["path",{d:"M9 19h8.5c.4 0 .9-.1 1.3-.2"}],["path",{d:"M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12"}],["path",{d:"m2 2 20 20"}],["path",{d:"M21 15.3a3.5 3.5 0 0 0-3.3-3.3"}],["path",{d:"M15 5h-4.3"}],["circle",{cx:"18",cy:"5",r:"3"}]]];var Nv=["svg",t,[["circle",{cx:"6",cy:"19",r:"3"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"}],["circle",{cx:"18",cy:"5",r:"3"}]]];var qv=["svg",t,[["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6.01 18H6"}],["path",{d:"M10.01 18H10"}],["path",{d:"M15 10v4"}],["path",{d:"M17.84 7.17a4 4 0 0 0-5.66 0"}],["path",{d:"M20.66 4.34a8 8 0 0 0-11.31 0"}]]];var Be=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 12h18"}]]];var Re=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 9H3"}],["path",{d:"M21 15H3"}]]];var Wv=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 7.5H3"}],["path",{d:"M21 12H3"}],["path",{d:"M21 16.5H3"}]]];var Zv=["svg",t,[["path",{d:"M4 11a9 9 0 0 1 9 9"}],["path",{d:"M4 4a16 16 0 0 1 16 16"}],["circle",{cx:"5",cy:"19",r:"1"}]]];var Uv=["svg",t,[["path",{d:"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"}],["path",{d:"m14.5 12.5 2-2"}],["path",{d:"m11.5 9.5 2-2"}],["path",{d:"m8.5 6.5 2-2"}],["path",{d:"m17.5 15.5 2-2"}]]];var Gv=["svg",t,[["path",{d:"M6 11h8a4 4 0 0 0 0-8H9v18"}],["path",{d:"M6 15h8"}]]];var _v=["svg",t,[["path",{d:"M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"}],["path",{d:"M21 14 10 2 3 14h18Z"}],["path",{d:"M10 2v16"}]]];var zv=["svg",t,[["path",{d:"M7 21h10"}],["path",{d:"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"}],["path",{d:"M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"}],["path",{d:"m13 12 4-4"}],["path",{d:"M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"}]]];var jv=["svg",t,[["path",{d:"M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3"}],["path",{d:"M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83"}],["path",{d:"m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z"}],["path",{d:"M12.97 19.77 7 15h12.5l-3.75 4.5a2 2 0 0 1-2.78.27Z"}]]];var Xv=["svg",t,[["path",{d:"M4 10a7.31 7.31 0 0 0 10 10Z"}],["path",{d:"m9 15 3-3"}],["path",{d:"M17 13a6 6 0 0 0-6-6"}],["path",{d:"M21 13A10 10 0 0 0 11 3"}]]];var Kv=["svg",t,[["path",{d:"M13 7 9 3 5 7l4 4"}],["path",{d:"m17 11 4 4-4 4-4-4"}],["path",{d:"m8 12 4 4 6-6-4-4Z"}],["path",{d:"m16 8 3-3"}],["path",{d:"M9 21a6 6 0 0 0-6-6"}]]];var Yv=["svg",t,[["path",{d:"M6 4a2 2 0 0 1 2-2h10l4 4v10.2a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-2Z"}],["path",{d:"M10 2v4h6"}],["path",{d:"M18 18v-7h-8v7"}],["path",{d:"M18 22H4a2 2 0 0 1-2-2V6"}]]];var Jv=["svg",t,[["path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}],["polyline",{points:"17 21 17 13 7 13 7 21"}],["polyline",{points:"7 3 7 8 15 8"}]]];var Ie=["svg",t,[["circle",{cx:"19",cy:"19",r:"2"}],["circle",{cx:"5",cy:"5",r:"2"}],["path",{d:"M5 7v12h12"}],["path",{d:"m5 19 6-6"}]]];var Qv=["svg",t,[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"}],["path",{d:"M7 21h10"}],["path",{d:"M12 3v18"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"}]]];var t4=["svg",t,[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{d:"M14 15H9v-5"}],["path",{d:"M16 3h5v5"}],["path",{d:"M21 3 9 15"}]]];var e4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M8 7v10"}],["path",{d:"M12 7v10"}],["path",{d:"M17 7v10"}]]];var a4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["circle",{cx:"12",cy:"12",r:"1"}],["path",{d:"M5 12s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5"}]]];var r4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 9h.01"}]]];var o4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M7 12h10"}]]];var s4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m16 16-1.9-1.9"}]]];var i4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M7 8h8"}],["path",{d:"M7 12h10"}],["path",{d:"M7 16h6"}]]];var n4=["svg",t,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}]]];var l4=["svg",t,[["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}],["circle",{cx:"18.5",cy:"5.5",r:".5",fill:"currentColor"}],["circle",{cx:"11.5",cy:"11.5",r:".5",fill:"currentColor"}],["circle",{cx:"7.5",cy:"16.5",r:".5",fill:"currentColor"}],["circle",{cx:"17.5",cy:"14.5",r:".5",fill:"currentColor"}],["path",{d:"M3 3v18h18"}]]];var d4=["svg",t,[["circle",{cx:"12",cy:"10",r:"1"}],["path",{d:"M22 20V8h-4l-6-4-6 4H2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"}],["path",{d:"M6 17v.01"}],["path",{d:"M6 13v.01"}],["path",{d:"M18 17v.01"}],["path",{d:"M18 13v.01"}],["path",{d:"M14 22v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"}]]];var c4=["svg",t,[["path",{d:"M14 22v-4a2 2 0 1 0-4 0v4"}],["path",{d:"m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"}],["path",{d:"M18 5v17"}],["path",{d:"m4 6 8-4 8 4"}],["path",{d:"M6 5v17"}],["circle",{cx:"12",cy:"9",r:"2"}]]];var p4=["svg",t,[["path",{d:"M5.42 9.42 8 12"}],["circle",{cx:"4",cy:"8",r:"2"}],["path",{d:"m14 6-8.58 8.58"}],["circle",{cx:"4",cy:"16",r:"2"}],["path",{d:"M10.8 14.8 14 18"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];var f4=["svg",t,[["path",{d:"M4 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2"}],["path",{d:"M10 22H8"}],["path",{d:"M16 22h-2"}],["circle",{cx:"8",cy:"8",r:"2"}],["path",{d:"M9.414 9.414 12 12"}],["path",{d:"M14.8 14.8 18 18"}],["circle",{cx:"8",cy:"16",r:"2"}],["path",{d:"m18 6-8.586 8.586"}]]];var h4=["svg",t,[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"2"}],["circle",{cx:"8",cy:"8",r:"2"}],["path",{d:"M9.414 9.414 12 12"}],["path",{d:"M14.8 14.8 18 18"}],["circle",{cx:"8",cy:"16",r:"2"}],["path",{d:"m18 6-8.586 8.586"}]]];var u4=["svg",t,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M8.12 8.12 12 12"}],["path",{d:"M20 4 8.12 15.88"}],["circle",{cx:"6",cy:"18",r:"3"}],["path",{d:"M14.8 14.8 20 20"}]]];var m4=["svg",t,[["path",{d:"M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m22 3-5 5"}],["path",{d:"m17 3 5 5"}]]];var x4=["svg",t,[["path",{d:"M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m17 8 5-5"}],["path",{d:"M17 3h5v5"}]]];var g4=["svg",t,[["path",{d:"M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4"}],["path",{d:"M15 8h-5"}],["path",{d:"M15 12h-5"}]]];var v4=["svg",t,[["path",{d:"M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4"}]]];var y4=["svg",t,[["path",{d:"m8 11 2 2 4-4"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];var M4=["svg",t,[["path",{d:"m9 9-2 2 2 2"}],["path",{d:"m13 13 2-2-2-2"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];var b4=["svg",t,[["path",{d:"m13.5 8.5-5 5"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];var S4=["svg",t,[["path",{d:"m13.5 8.5-5 5"}],["path",{d:"m8.5 8.5 5 5"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];var A4=["svg",t,[["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];var $e=["svg",t,[["path",{d:"m3 3 3 9-3 9 19-9Z"}],["path",{d:"M6 12h16"}]]];var w4=["svg",t,[["rect",{x:"14",y:"14",width:"8",height:"8",rx:"2"}],["rect",{x:"2",y:"2",width:"8",height:"8",rx:"2"}],["path",{d:"M7 14v1a2 2 0 0 0 2 2h1"}],["path",{d:"M14 7h1a2 2 0 0 1 2 2v1"}]]];var C4=["svg",t,[["path",{d:"m22 2-7 20-4-9-9-4Z"}],["path",{d:"M22 2 11 13"}]]];var L4=["svg",t,[["line",{x1:"3",x2:"21",y1:"12",y2:"12"}],["polyline",{points:"8 8 12 4 16 8"}],["polyline",{points:"16 16 12 20 8 16"}]]];var E4=["svg",t,[["line",{x1:"12",x2:"12",y1:"3",y2:"21"}],["polyline",{points:"8 8 4 12 8 16"}],["polyline",{points:"16 16 20 12 16 8"}]]];var k4=["svg",t,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5"}],["path",{d:"M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5"}],["path",{d:"M6 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"m15.7 13.4-.9-.3"}],["path",{d:"m9.2 10.9-.9-.3"}],["path",{d:"m10.6 15.7.3-.9"}],["path",{d:"m13.6 15.7-.4-1"}],["path",{d:"m10.8 9.3-.4-1"}],["path",{d:"m8.3 13.6 1-.4"}],["path",{d:"m14.7 10.8 1-.4"}],["path",{d:"m13.4 8.3-.3.9"}]]];var P4=["svg",t,[["path",{d:"M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"}],["path",{d:"M6 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"m13 6-4 6h6l-4 6"}]]];var T4=["svg",t,[["path",{d:"M7 2h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5"}],["path",{d:"M10 10 2.5 2.5C2 2 2 2.5 2 5v3a2 2 0 0 0 2 2h6z"}],["path",{d:"M22 17v-1a2 2 0 0 0-2-2h-1"}],["path",{d:"M4 14a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16.5l1-.5.5.5-8-8H4z"}],["path",{d:"M6 18h.01"}],["path",{d:"m2 2 20 20"}]]];var D4=["svg",t,[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18"}]]];var H4=["svg",t,[["path",{d:"M20 7h-9"}],["path",{d:"M14 17H5"}],["circle",{cx:"17",cy:"17",r:"3"}],["circle",{cx:"7",cy:"7",r:"3"}]]];var F4=["svg",t,[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}],["circle",{cx:"12",cy:"12",r:"3"}]]];var V4=["svg",t,[["path",{d:"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"}],["rect",{x:"3",y:"14",width:"7",height:"7",rx:"1"}],["circle",{cx:"17.5",cy:"17.5",r:"3.5"}]]];var B4=["svg",t,[["circle",{cx:"18",cy:"5",r:"3"}],["circle",{cx:"6",cy:"12",r:"3"}],["circle",{cx:"18",cy:"19",r:"3"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49"}]]];var R4=["svg",t,[["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["polyline",{points:"16 6 12 2 8 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"15"}]]];var I4=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["line",{x1:"3",x2:"21",y1:"9",y2:"9"}],["line",{x1:"3",x2:"21",y1:"15",y2:"15"}],["line",{x1:"9",x2:"9",y1:"9",y2:"21"}],["line",{x1:"15",x2:"15",y1:"9",y2:"21"}]]];var $4=["svg",t,[["path",{d:"M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44"}]]];var O4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M12 8v4"}],["path",{d:"M12 16h.01"}]]];var N4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"m4 5 14 12"}]]];var q4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"m9 12 2 2 4-4"}]]];var W4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M8 11h.01"}],["path",{d:"M12 11h.01"}],["path",{d:"M16 11h.01"}]]];var Z4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M12 22V2"}]]];var U4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M9 11h6"}]]];var G4=["svg",t,[["path",{d:"M19.7 14a6.9 6.9 0 0 0 .3-2V5l-8-3-3.2 1.2"}],["path",{d:"m2 2 20 20"}],["path",{d:"M4.7 4.7 4 5v7c0 6 8 10 8 10a20.3 20.3 0 0 0 5.62-4.38"}]]];var _4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M9 11h6"}],["path",{d:"M12 8v6"}]]];var z4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];var Oe=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}],["path",{d:"m14.5 9-5 5"}],["path",{d:"m9.5 9 5 5"}]]];var j4=["svg",t,[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}]]];var X4=["svg",t,[["circle",{cx:"12",cy:"12",r:"8"}],["path",{d:"M12 2v7.5"}],["path",{d:"m19 5-5.23 5.23"}],["path",{d:"M22 12h-7.5"}],["path",{d:"m19 19-5.23-5.23"}],["path",{d:"M12 14.5V22"}],["path",{d:"M10.23 13.77 5 19"}],["path",{d:"M9.5 12H2"}],["path",{d:"M10.23 10.23 5 5"}],["circle",{cx:"12",cy:"12",r:"2.5"}]]];var K4=["svg",t,[["path",{d:"M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"}],["path",{d:"M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"}],["path",{d:"M12 10v4"}],["path",{d:"M12 2v3"}]]];var Y4=["svg",t,[["path",{d:"M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"}]]];var J4=["svg",t,[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"}],["path",{d:"M3 6h18"}],["path",{d:"M16 10a4 4 0 0 1-8 0"}]]];var Q4=["svg",t,[["path",{d:"m15 11-1 9"}],["path",{d:"m19 11-4-7"}],["path",{d:"M2 11h20"}],["path",{d:"m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"}],["path",{d:"M4.5 15.5h15"}],["path",{d:"m5 11 4-7"}],["path",{d:"m9 11 1 9"}]]];var t5=["svg",t,[["circle",{cx:"8",cy:"21",r:"1"}],["circle",{cx:"19",cy:"21",r:"1"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"}]]];var e5=["svg",t,[["path",{d:"M2 22v-5l5-5 5 5-5 5z"}],["path",{d:"M9.5 14.5 16 8"}],["path",{d:"m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0s0 0 0 0a3.53 3.53 0 0 1 0-5L17 2"}]]];var a5=["svg",t,[["path",{d:"m4 4 2.5 2.5"}],["path",{d:"M13.5 6.5a4.95 4.95 0 0 0-7 7"}],["path",{d:"M15 5 5 15"}],["path",{d:"M14 17v.01"}],["path",{d:"M10 16v.01"}],["path",{d:"M13 13v.01"}],["path",{d:"M16 10v.01"}],["path",{d:"M11 20v.01"}],["path",{d:"M17 14v.01"}],["path",{d:"M20 11v.01"}]]];var r5=["svg",t,[["path",{d:"m15 15 6 6m-6-6v4.8m0-4.8h4.8"}],["path",{d:"M9 19.8V15m0 0H4.2M9 15l-6 6"}],["path",{d:"M15 4.2V9m0 0h4.8M15 9l6-6"}],["path",{d:"M9 4.2V9m0 0H4.2M9 9 3 3"}]]];var o5=["svg",t,[["path",{d:"M12 22v-7l-2-2"}],["path",{d:"M17 8v.8A6 6 0 0 1 13.8 20v0H10v0A6.5 6.5 0 0 1 7 8h0a5 5 0 0 1 10 0Z"}],["path",{d:"m14 14-2 2"}]]];var s5=["svg",t,[["path",{d:"M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"}],["path",{d:"m18 2 4 4-4 4"}],["path",{d:"M2 6h1.9c1.5 0 2.9.9 3.6 2.2"}],["path",{d:"M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"}],["path",{d:"m18 14 4 4-4 4"}]]];var i5=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M16 8.9V7H8l4 5-4 5h8v-1.9"}]]];var n5=["svg",t,[["path",{d:"M18 7V4H6l6 8-6 8h12v-3"}]]];var l5=["svg",t,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}],["path",{d:"M17 20V8"}]]];var d5=["svg",t,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}]]];var c5=["svg",t,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}]]];var p5=["svg",t,[["path",{d:"M2 20h.01"}]]];var f5=["svg",t,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}],["path",{d:"M17 20V8"}],["path",{d:"M22 4v16"}]]];var h5=["svg",t,[["path",{d:"M10 9H4L2 7l2-2h6"}],["path",{d:"M14 5h6l2 2-2 2h-6"}],["path",{d:"M10 22V4a2 2 0 1 1 4 0v18"}],["path",{d:"M8 22h8"}]]];var u5=["svg",t,[["path",{d:"M12 3v3"}],["path",{d:"M18.5 13h-13L2 9.5 5.5 6h13L22 9.5Z"}],["path",{d:"M12 13v8"}]]];var m5=["svg",t,[["path",{d:"M7 18v-6a5 5 0 1 1 10 0v6"}],["path",{d:"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"}],["path",{d:"M21 12h1"}],["path",{d:"M18.5 4.5 18 5"}],["path",{d:"M2 12h1"}],["path",{d:"M12 2v1"}],["path",{d:"m4.929 4.929.707.707"}],["path",{d:"M12 12v6"}]]];var x5=["svg",t,[["polygon",{points:"19 20 9 12 19 4 19 20"}],["line",{x1:"5",x2:"5",y1:"19",y2:"5"}]]];var g5=["svg",t,[["polygon",{points:"5 4 15 12 5 20 5 4"}],["line",{x1:"19",x2:"19",y1:"5",y2:"19"}]]];var v5=["svg",t,[["circle",{cx:"9",cy:"12",r:"1"}],["circle",{cx:"15",cy:"12",r:"1"}],["path",{d:"M8 20v2h8v-2"}],["path",{d:"m12.5 17-.5-1-.5 1h1z"}],["path",{d:"M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"}]]];var y5=["svg",t,[["rect",{width:"3",height:"8",x:"13",y:"2",rx:"1.5"}],["path",{d:"M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"}],["rect",{width:"3",height:"8",x:"8",y:"14",rx:"1.5"}],["path",{d:"M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"}],["rect",{width:"8",height:"3",x:"14",y:"13",rx:"1.5"}],["path",{d:"M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5"}],["rect",{width:"8",height:"3",x:"2",y:"8",rx:"1.5"}],["path",{d:"M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5"}]]];var Ne=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["line",{x1:"9",x2:"15",y1:"15",y2:"9"}]]];var M5=["svg",t,[["path",{d:"M22 2 2 22"}]]];var b5=["svg",t,[["path",{d:"m8 14-6 6h9v-3"}],["path",{d:"M18.37 3.63 8 14l3 3L21.37 6.63a2.12 2.12 0 1 0-3-3Z"}]]];var S5=["svg",t,[["line",{x1:"21",x2:"14",y1:"4",y2:"4"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22"}]]];var A5=["svg",t,[["line",{x1:"4",x2:"4",y1:"21",y2:"14"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16"}]]];var w5=["svg",t,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12.667 8 10 12h4l-2.667 4"}]]];var C5=["svg",t,[["rect",{width:"7",height:"12",x:"2",y:"6",rx:"1"}],["path",{d:"M13 8.32a7.43 7.43 0 0 1 0 7.36"}],["path",{d:"M16.46 6.21a11.76 11.76 0 0 1 0 11.58"}],["path",{d:"M19.91 4.1a15.91 15.91 0 0 1 .01 15.8"}]]];var L5=["svg",t,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12 18h.01"}]]];var E5=["svg",t,[["path",{d:"M22 11v1a10 10 0 1 1-9-10"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}],["path",{d:"M16 5h6"}],["path",{d:"M19 2v6"}]]];var k5=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];var P5=["svg",t,[["path",{d:"M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0"}],["circle",{cx:"10",cy:"13",r:"8"}],["path",{d:"M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6"}],["path",{d:"M18 3 19.1 5.2"}],["path",{d:"M22 3 20.9 5.2"}]]];var T5=["svg",t,[["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}],["path",{d:"m20 16-4-4 4-4"}],["path",{d:"m4 8 4 4-4 4"}],["path",{d:"m16 4-4 4-4-4"}],["path",{d:"m8 20 4-4 4 4"}]]];var D5=["svg",t,[["path",{d:"M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"}],["path",{d:"M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"}],["path",{d:"M4 18v2"}],["path",{d:"M20 18v2"}],["path",{d:"M12 4v9"}]]];var H5=["svg",t,[["path",{d:"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"}],["path",{d:"M7 21h10"}],["path",{d:"M19.5 12 22 6"}],["path",{d:"M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"}],["path",{d:"M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"}],["path",{d:"M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"}]]];var F5=["svg",t,[["path",{d:"M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"}]]];var V5=["svg",t,[["path",{d:"M5 9c-1.5 1.5-3 3.2-3 5.5A5.5 5.5 0 0 0 7.5 20c1.8 0 3-.5 4.5-2 1.5 1.5 2.7 2 4.5 2a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.5-4-3-5.5l-7-7-7 7Z"}],["path",{d:"M12 18v4"}]]];var B5=["svg",t,[["path",{d:"m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"}]]];var qe=["svg",t,[["path",{d:"m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"}],["path",{d:"M5 3v4"}],["path",{d:"M19 17v4"}],["path",{d:"M3 5h4"}],["path",{d:"M17 19h4"}]]];var R5=["svg",t,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M12 6h.01"}],["circle",{cx:"12",cy:"14",r:"4"}],["path",{d:"M12 14h.01"}]]];var I5=["svg",t,[["path",{d:"M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"}],["path",{d:"M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"}],["path",{d:"M17 15a3.5 3.5 0 0 0-.025-4.975"}]]];var $5=["svg",t,[["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}],["path",{d:"M4 21c1.1 0 1.1-1 2.3-1s1.1 1 2.3 1c1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1"}]]];var O5=["svg",t,[["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}],["path",{d:"m16 20 2 2 4-4"}]]];var N5=["svg",t,[["circle",{cx:"19",cy:"5",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M5 17A12 12 0 0 1 17 5"}]]];var q5=["svg",t,[["path",{d:"M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3"}],["path",{d:"M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20"}]]];var W5=["svg",t,[["path",{d:"M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3"}],["path",{d:"M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12"}]]];var Z5=["svg",t,[["path",{d:"M16 3h5v5"}],["path",{d:"M8 3H3v5"}],["path",{d:"M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"}],["path",{d:"m15 9 6-6"}]]];var U5=["svg",t,[["path",{d:"M3 3h.01"}],["path",{d:"M7 5h.01"}],["path",{d:"M11 7h.01"}],["path",{d:"M3 7h.01"}],["path",{d:"M7 9h.01"}],["path",{d:"M3 11h.01"}],["rect",{width:"4",height:"4",x:"15",y:"5"}],["path",{d:"m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2"}],["path",{d:"m13 14 8-2"}],["path",{d:"m13 19 8-2"}]]];var G5=["svg",t,[["path",{d:"M7 20h10"}],["path",{d:"M10 20c5.5-2.5.8-6.4 3-10"}],["path",{d:"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"}],["path",{d:"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"}]]];var _5=["svg",t,[["path",{d:"m10 10-2 2 2 2"}],["path",{d:"m14 14 2-2-2-2"}],["path",{d:"M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2"}],["path",{d:"M9 21h1"}],["path",{d:"M14 21h1"}]]];var z5=["svg",t,[["path",{d:"M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2"}],["path",{d:"M9 21h1"}],["path",{d:"M14 21h1"}]]];var Lt=["svg",t,[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{d:"M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"}]]];var j5=["svg",t,[["path",{d:"M7 12h2l2 5 2-10h4"}],["rect",{x:"3",y:"3",width:"18",height:"18",rx:"2"}]]];var X5=["svg",t,[["path",{d:"M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"}],["path",{d:"M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"}],["rect",{width:"8",height:"8",x:"14",y:"14",rx:"2"}]]];var We=["svg",t,[["path",{d:"M18 21a6 6 0 0 0-12 0"}],["circle",{cx:"12",cy:"11",r:"4"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];var Ze=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"}]]];var K5=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];var Y5=["svg",t,[["path",{d:"M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9"}]]];var J5=["svg",t,[["path",{d:"M15.236 22a3 3 0 0 0-2.2-5"}],["path",{d:"M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4"}],["path",{d:"M18 13h.01"}],["path",{d:"M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10"}]]];var Q5=["svg",t,[["path",{d:"M5 22h14"}],["path",{d:"M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"}],["path",{d:"M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"}]]];var t3=["svg",t,[["path",{d:"M12 17.8 5.8 21 7 14.1 2 9.3l7-1L12 2"}]]];var e3=["svg",t,[["path",{d:"M8.34 8.34 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-.59-3.43"}],["path",{d:"M18.42 12.76 22 9.27l-6.91-1L12 2l-1.44 2.91"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var a3=["svg",t,[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"}]]];var r3=["svg",t,[["line",{x1:"18",x2:"18",y1:"20",y2:"4"}],["polygon",{points:"14,20 4,12 14,4"}]]];var o3=["svg",t,[["line",{x1:"6",x2:"6",y1:"4",y2:"20"}],["polygon",{points:"10,4 20,12 10,20"}]]];var s3=["svg",t,[["path",{d:"M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"}],["path",{d:"M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"}],["circle",{cx:"20",cy:"10",r:"2"}]]];var i3=["svg",t,[["path",{d:"M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"}],["path",{d:"M14 3v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 13h0"}],["path",{d:"M16 13h0"}],["path",{d:"M10 16s.8 1 2 1c1.3 0 2-1 2-1"}]]];var n3=["svg",t,[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4"}]]];var l3=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["rect",{width:"6",height:"6",x:"9",y:"9"}]]];var d3=["svg",t,[["path",{d:"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"}],["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["path",{d:"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"}],["path",{d:"M2 7h20"}],["path",{d:"M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"}]]];var c3=["svg",t,[["rect",{width:"20",height:"6",x:"2",y:"4",rx:"2"}],["rect",{width:"20",height:"6",x:"2",y:"14",rx:"2"}]]];var p3=["svg",t,[["rect",{width:"6",height:"20",x:"4",y:"2",rx:"2"}],["rect",{width:"6",height:"20",x:"14",y:"2",rx:"2"}]]];var f3=["svg",t,[["path",{d:"M16 4H9a3 3 0 0 0-2.83 4"}],["path",{d:"M14 12a4 4 0 0 1 0 8H6"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12"}]]];var h3=["svg",t,[["path",{d:"m4 5 8 8"}],["path",{d:"m12 5-8 8"}],["path",{d:"M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07"}]]];var u3=["svg",t,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 4h.01"}],["path",{d:"M20 12h.01"}],["path",{d:"M12 20h.01"}],["path",{d:"M4 12h.01"}],["path",{d:"M17.657 6.343h.01"}],["path",{d:"M17.657 17.657h.01"}],["path",{d:"M6.343 17.657h.01"}],["path",{d:"M6.343 6.343h.01"}]]];var m3=["svg",t,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 3v1"}],["path",{d:"M12 20v1"}],["path",{d:"M3 12h1"}],["path",{d:"M20 12h1"}],["path",{d:"m18.364 5.636-.707.707"}],["path",{d:"m6.343 17.657-.707.707"}],["path",{d:"m5.636 5.636.707.707"}],["path",{d:"m17.657 17.657.707.707"}]]];var x3=["svg",t,[["path",{d:"M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"}],["path",{d:"M12 2v2"}],["path",{d:"M12 20v2"}],["path",{d:"m4.9 4.9 1.4 1.4"}],["path",{d:"m17.7 17.7 1.4 1.4"}],["path",{d:"M2 12h2"}],["path",{d:"M20 12h2"}],["path",{d:"m6.3 17.7-1.4 1.4"}],["path",{d:"m19.1 4.9-1.4 1.4"}]]];var g3=["svg",t,[["path",{d:"M10 9a3 3 0 1 0 0 6"}],["path",{d:"M2 12h1"}],["path",{d:"M14 21V3"}],["path",{d:"M10 4V3"}],["path",{d:"M10 21v-1"}],["path",{d:"m3.64 18.36.7-.7"}],["path",{d:"m4.34 6.34-.7-.7"}],["path",{d:"M14 12h8"}],["path",{d:"m17 4-3 3"}],["path",{d:"m14 17 3 3"}],["path",{d:"m21 15-3-3 3-3"}]]];var v3=["svg",t,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 2v2"}],["path",{d:"M12 20v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"m17.66 17.66 1.41 1.41"}],["path",{d:"M2 12h2"}],["path",{d:"M20 12h2"}],["path",{d:"m6.34 17.66-1.41 1.41"}],["path",{d:"m19.07 4.93-1.41 1.41"}]]];var y3=["svg",t,[["path",{d:"M12 2v8"}],["path",{d:"m4.93 10.93 1.41 1.41"}],["path",{d:"M2 18h2"}],["path",{d:"M20 18h2"}],["path",{d:"m19.07 10.93-1.41 1.41"}],["path",{d:"M22 22H2"}],["path",{d:"m8 6 4-4 4 4"}],["path",{d:"M16 18a4 4 0 0 0-8 0"}]]];var M3=["svg",t,[["path",{d:"M12 10V2"}],["path",{d:"m4.93 10.93 1.41 1.41"}],["path",{d:"M2 18h2"}],["path",{d:"M20 18h2"}],["path",{d:"m19.07 10.93-1.41 1.41"}],["path",{d:"M22 22H2"}],["path",{d:"m16 6-4 4-4-4"}],["path",{d:"M16 18a4 4 0 0 0-8 0"}]]];var b3=["svg",t,[["path",{d:"m4 19 8-8"}],["path",{d:"m12 19-8-8"}],["path",{d:"M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06"}]]];var S3=["svg",t,[["path",{d:"M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z"}],["path",{d:"M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7"}],["path",{d:"M 7 17h0.01"}],["path",{d:"m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8"}]]];var A3=["svg",t,[["path",{d:"M10 21V3h8"}],["path",{d:"M6 16h9"}],["path",{d:"M10 9.5h7"}]]];var w3=["svg",t,[["path",{d:"M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"}],["path",{d:"M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m18 22-3-3 3-3"}],["path",{d:"m6 2 3 3-3 3"}]]];var C3=["svg",t,[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19"}]]];var L3=["svg",t,[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19"}],["polyline",{points:"14.5 6.5 18 3 21 3 21 6 17.5 9.5"}],["line",{x1:"5",x2:"9",y1:"14",y2:"18"}],["line",{x1:"7",x2:"4",y1:"17",y2:"20"}],["line",{x1:"3",x2:"5",y1:"19",y2:"21"}]]];var E3=["svg",t,[["path",{d:"m18 2 4 4"}],["path",{d:"m17 7 3-3"}],["path",{d:"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"}],["path",{d:"m9 11 4 4"}],["path",{d:"m5 19-3 3"}],["path",{d:"m14 4 6 6"}]]];var k3=["svg",t,[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"}]]];var P3=["svg",t,[["path",{d:"M12 21v-6"}],["path",{d:"M12 9V3"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];var T3=["svg",t,[["path",{d:"M12 15V9"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];var D3=["svg",t,[["path",{d:"M14 14v2"}],["path",{d:"M14 20v2"}],["path",{d:"M14 2v2"}],["path",{d:"M14 8v2"}],["path",{d:"M2 15h8"}],["path",{d:"M2 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2"}],["path",{d:"M2 9h8"}],["path",{d:"M22 15h-4"}],["path",{d:"M22 3h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"}],["path",{d:"M22 9h-4"}],["path",{d:"M5 3v18"}]]];var H3=["svg",t,[["path",{d:"M15 3v18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 9H3"}],["path",{d:"M21 15H3"}]]];var F3=["svg",t,[["path",{d:"M14 10h2"}],["path",{d:"M15 22v-8"}],["path",{d:"M15 2v4"}],["path",{d:"M2 10h2"}],["path",{d:"M20 10h2"}],["path",{d:"M3 19h18"}],["path",{d:"M3 22v-6a2 2 135 0 1 2-2h14a2 2 45 0 1 2 2v6"}],["path",{d:"M3 2v2a2 2 45 0 0 2 2h14a2 2 135 0 0 2-2V2"}],["path",{d:"M8 10h2"}],["path",{d:"M9 22v-8"}],["path",{d:"M9 2v4"}]]];var V3=["svg",t,[["path",{d:"M12 3v18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}]]];var B3=["svg",t,[["rect",{width:"10",height:"14",x:"3",y:"8",rx:"2"}],["path",{d:"M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4"}],["path",{d:"M8 18h.01"}]]];var R3=["svg",t,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18"}]]];var I3=["svg",t,[["circle",{cx:"7",cy:"7",r:"5"}],["circle",{cx:"17",cy:"17",r:"5"}],["path",{d:"M12 17h10"}],["path",{d:"m3.46 10.54 7.08-7.08"}]]];var $3=["svg",t,[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}]]];var O3=["svg",t,[["path",{d:"m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"}],["path",{d:"M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"}],["circle",{cx:"6.5",cy:"9.5",r:".5",fill:"currentColor"}]]];var N3=["svg",t,[["path",{d:"M4 4v16"}]]];var q3=["svg",t,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}]]];var W3=["svg",t,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}]]];var Z3=["svg",t,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}],["path",{d:"M19 4v16"}]]];var U3=["svg",t,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}],["path",{d:"M19 4v16"}],["path",{d:"M22 6 2 18"}]]];var G3=["svg",t,[["circle",{cx:"17",cy:"4",r:"2"}],["path",{d:"M15.59 5.41 5.41 15.59"}],["circle",{cx:"4",cy:"17",r:"2"}],["path",{d:"M12 22s-4-9-1.5-11.5S22 12 22 12"}]]];var _3=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"6"}],["circle",{cx:"12",cy:"12",r:"2"}]]];var z3=["svg",t,[["path",{d:"m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"}],["path",{d:"m13.56 11.747 4.332-.924"}],["path",{d:"m16 21-3.105-6.21"}],["path",{d:"M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"}],["path",{d:"m6.158 8.633 1.114 4.456"}],["path",{d:"m8 21 3.105-6.21"}],["circle",{cx:"12",cy:"13",r:"2"}]]];var j3=["svg",t,[["circle",{cx:"4",cy:"4",r:"2"}],["path",{d:"m14 5 3-3 3 3"}],["path",{d:"m14 10 3-3 3 3"}],["path",{d:"M17 14V2"}],["path",{d:"M17 14H7l-5 8h20Z"}],["path",{d:"M8 14v8"}],["path",{d:"m9 14 5 8"}]]];var X3=["svg",t,[["path",{d:"M3.5 21 14 3"}],["path",{d:"M20.5 21 10 3"}],["path",{d:"M15.5 21 12 15l-3.5 6"}],["path",{d:"M2 21h20"}]]];var K3=["svg",t,[["path",{d:"m7 11 2-2-2-2"}],["path",{d:"M11 13h4"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}]]];var Y3=["svg",t,[["polyline",{points:"4 17 10 11 4 5"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19"}]]];var J3=["svg",t,[["path",{d:"M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01v0a2.83 2.83 0 0 1 0-4L17 3"}],["path",{d:"m16 2 6 6"}],["path",{d:"M12 16H4"}]]];var Q3=["svg",t,[["path",{d:"M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"}],["path",{d:"M8.5 2h7"}],["path",{d:"M14.5 16h-5"}]]];var ty=["svg",t,[["path",{d:"M9 2v17.5A2.5 2.5 0 0 1 6.5 22v0A2.5 2.5 0 0 1 4 19.5V2"}],["path",{d:"M20 2v17.5a2.5 2.5 0 0 1-2.5 2.5v0a2.5 2.5 0 0 1-2.5-2.5V2"}],["path",{d:"M3 2h7"}],["path",{d:"M14 2h7"}],["path",{d:"M9 16H4"}],["path",{d:"M20 16h-5"}]]];var ey=["svg",t,[["path",{d:"M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"}],["path",{d:"M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"}],["path",{d:"M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"}],["path",{d:"M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"}],["path",{d:"M9 7v10"}]]];var ay=["svg",t,[["path",{d:"M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1"}],["path",{d:"M7 22h1a4 4 0 0 0 4-4v-1"}],["path",{d:"M7 2h1a4 4 0 0 1 4 4v1"}]]];var ry=["svg",t,[["path",{d:"M17 6H3"}],["path",{d:"M21 12H8"}],["path",{d:"M21 18H8"}],["path",{d:"M3 12v6"}]]];var oy=["svg",t,[["path",{d:"M21 6H3"}],["path",{d:"M10 12H3"}],["path",{d:"M10 18H3"}],["circle",{cx:"17",cy:"15",r:"3"}],["path",{d:"m21 19-1.9-1.9"}]]];var Ue=["svg",t,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 3h1"}],["path",{d:"M14 21h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v1"}],["path",{d:"M3 14v1"}],["path",{d:"M21 14v1"}],["line",{x1:"7",x2:"15",y1:"8",y2:"8"}],["line",{x1:"7",x2:"17",y1:"12",y2:"12"}],["line",{x1:"7",x2:"13",y1:"16",y2:"16"}]]];var sy=["svg",t,[["path",{d:"M17 6.1H3"}],["path",{d:"M21 12.1H3"}],["path",{d:"M15.1 18H3"}]]];var iy=["svg",t,[["path",{d:"M2 10s3-3 3-8"}],["path",{d:"M22 10s-3-3-3-8"}],["path",{d:"M10 2c0 4.4-3.6 8-8 8"}],["path",{d:"M14 2c0 4.4 3.6 8 8 8"}],["path",{d:"M2 10s2 2 2 5"}],["path",{d:"M22 10s-2 2-2 5"}],["path",{d:"M8 15h8"}],["path",{d:"M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"}],["path",{d:"M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"}]]];var ny=["svg",t,[["path",{d:"M2 12h10"}],["path",{d:"M9 4v16"}],["path",{d:"m3 9 3 3-3 3"}],["path",{d:"M12 6 9 9 6 6"}],["path",{d:"m6 18 3-3 1.5 1.5"}],["path",{d:"M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}]]];var ly=["svg",t,[["path",{d:"M12 9a4 4 0 0 0-2 7.5"}],["path",{d:"M12 3v2"}],["path",{d:"m6.6 18.4-1.4 1.4"}],["path",{d:"M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}],["path",{d:"M4 13H2"}],["path",{d:"M6.34 7.34 4.93 5.93"}]]];var dy=["svg",t,[["path",{d:"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}]]];var cy=["svg",t,[["path",{d:"M17 14V2"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"}]]];var py=["svg",t,[["path",{d:"M7 10v12"}],["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"}]]];var fy=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9 12 2 2 4-4"}]]];var hy=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 12h6"}]]];var uy=["svg",t,[["path",{d:"M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 9h.01"}],["path",{d:"m15 9-6 6"}],["path",{d:"M15 15h.01"}]]];var my=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 12h6"}],["path",{d:"M12 9v6"}]]];var xy=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9.5 14.5 5-5"}]]];var gy=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9.5 14.5 5-5"}],["path",{d:"m9.5 9.5 5 5"}]]];var vy=["svg",t,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M13 5v2"}],["path",{d:"M13 17v2"}],["path",{d:"M13 11v2"}]]];var yy=["svg",t,[["path",{d:"M10 2h4"}],["path",{d:"M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7"}],["path",{d:"M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2"}],["path",{d:"m2 2 20 20"}],["path",{d:"M12 12v-2"}]]];var My=["svg",t,[["path",{d:"M10 2h4"}],["path",{d:"M12 14v-4"}],["path",{d:"M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"}],["path",{d:"M9 17H4v5"}]]];var by=["svg",t,[["line",{x1:"10",x2:"14",y1:"2",y2:"2"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11"}],["circle",{cx:"12",cy:"14",r:"8"}]]];var Sy=["svg",t,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"6",ry:"6"}],["circle",{cx:"8",cy:"12",r:"2"}]]];var Ay=["svg",t,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"6",ry:"6"}],["circle",{cx:"16",cy:"12",r:"2"}]]];var wy=["svg",t,[["path",{d:"M21 4H3"}],["path",{d:"M18 8H6"}],["path",{d:"M19 12H9"}],["path",{d:"M16 16h-6"}],["path",{d:"M11 20H9"}]]];var Cy=["svg",t,[["ellipse",{cx:"12",cy:"11",rx:"3",ry:"2"}],["ellipse",{cx:"12",cy:"12.5",rx:"10",ry:"8.5"}]]];var Ly=["svg",t,[["path",{d:"M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16"}],["path",{d:"M2 14h12"}],["path",{d:"M22 14h-2"}],["path",{d:"M12 20v-6"}],["path",{d:"m2 2 20 20"}],["path",{d:"M22 16V6a2 2 0 0 0-2-2H10"}]]];var Ey=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M2 14h20"}],["path",{d:"M12 20v-6"}]]];var ky=["svg",t,[["path",{d:"M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z"}],["path",{d:"M8 13v9"}],["path",{d:"M16 22v-9"}],["path",{d:"m9 6 1 7"}],["path",{d:"m15 6-1 7"}],["path",{d:"M12 6V2"}],["path",{d:"M13 2h-2"}]]];var Py=["svg",t,[["rect",{width:"18",height:"12",x:"3",y:"8",rx:"1"}],["path",{d:"M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3"}],["path",{d:"M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3"}]]];var Ty=["svg",t,[["path",{d:"m10 11 11 .9c.6 0 .9.5.8 1.1l-.8 5h-1"}],["path",{d:"M16 18h-5"}],["path",{d:"M18 5a1 1 0 0 0-1 1v5.573"}],["path",{d:"M3 4h9l1 7.246"}],["path",{d:"M4 11V4"}],["path",{d:"M7 15h.01"}],["path",{d:"M8 10.1V4"}],["circle",{cx:"18",cy:"18",r:"2"}],["circle",{cx:"7",cy:"15",r:"5"}]]];var Dy=["svg",t,[["path",{d:"M9.3 6.2a4.55 4.55 0 0 0 5.4 0"}],["path",{d:"M7.9 10.7c.9.8 2.4 1.3 4.1 1.3s3.2-.5 4.1-1.3"}],["path",{d:"M13.9 3.5a1.93 1.93 0 0 0-3.8-.1l-3 10c-.1.2-.1.4-.1.6 0 1.7 2.2 3 5 3s5-1.3 5-3c0-.2 0-.4-.1-.5Z"}],["path",{d:"m7.5 12.2-4.7 2.7c-.5.3-.8.7-.8 1.1s.3.8.8 1.1l7.6 4.5c.9.5 2.1.5 3 0l7.6-4.5c.7-.3 1-.7 1-1.1s-.3-.8-.8-1.1l-4.7-2.8"}]]];var Hy=["svg",t,[["path",{d:"M2 22V12a10 10 0 1 1 20 0v10"}],["path",{d:"M15 6.8v1.4a3 2.8 0 1 1-6 0V6.8"}],["path",{d:"M10 15h.01"}],["path",{d:"M14 15h.01"}],["path",{d:"M10 19a4 4 0 0 1-4-4v-3a6 6 0 1 1 12 0v3a4 4 0 0 1-4 4Z"}],["path",{d:"m9 19-2 3"}],["path",{d:"m15 19 2 3"}]]];var Fy=["svg",t,[["path",{d:"M8 3.1V7a4 4 0 0 0 8 0V3.1"}],["path",{d:"m9 15-1-1"}],["path",{d:"m15 15 1-1"}],["path",{d:"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"}],["path",{d:"m8 19-2 3"}],["path",{d:"m16 19 2 3"}]]];var Vy=["svg",t,[["path",{d:"M2 17 17 2"}],["path",{d:"m2 14 8 8"}],["path",{d:"m5 11 8 8"}],["path",{d:"m8 8 8 8"}],["path",{d:"m11 5 8 8"}],["path",{d:"m14 2 8 8"}],["path",{d:"M7 22 22 7"}]]];var Ge=["svg",t,[["rect",{width:"16",height:"16",x:"4",y:"3",rx:"2"}],["path",{d:"M4 11h16"}],["path",{d:"M12 3v8"}],["path",{d:"m8 19-2 3"}],["path",{d:"m18 22-2-3"}],["path",{d:"M8 15h0"}],["path",{d:"M16 15h0"}]]];var By=["svg",t,[["path",{d:"M3 6h18"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17"}]]];var Ry=["svg",t,[["path",{d:"M3 6h18"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}]]];var Iy=["svg",t,[["path",{d:"M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"}],["path",{d:"M12 19v3"}]]];var $y=["svg",t,[["path",{d:"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"}],["path",{d:"M12 22v-3"}]]];var Oy=["svg",t,[["path",{d:"M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"}],["path",{d:"M7 16v6"}],["path",{d:"M13 19v3"}],["path",{d:"M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"}]]];var Ny=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["rect",{width:"3",height:"9",x:"7",y:"7"}],["rect",{width:"3",height:"5",x:"14",y:"7"}]]];var qy=["svg",t,[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7"}],["polyline",{points:"16 17 22 17 22 11"}]]];var Wy=["svg",t,[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17"}],["polyline",{points:"16 7 22 7 22 13"}]]];var Zy=["svg",t,[["path",{d:"M22 18a2 2 0 0 1-2 2H3c-1.1 0-1.3-.6-.4-1.3L20.4 4.3c.9-.7 1.6-.4 1.6.7Z"}]]];var Uy=["svg",t,[["path",{d:"M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"}]]];var Gy=["svg",t,[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18"}],["path",{d:"M4 22h16"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z"}]]];var _y=["svg",t,[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}],["path",{d:"M15 18H9"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"}],["circle",{cx:"17",cy:"18",r:"2"}],["circle",{cx:"7",cy:"18",r:"2"}]]];var zy=["svg",t,[["path",{d:"m12 10 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a8 8 0 1 0-16 0v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3l2-4h4Z"}],["path",{d:"M4.82 7.9 8 10"}],["path",{d:"M15.18 7.9 12 10"}],["path",{d:"M16.93 10H20a2 2 0 0 1 0 4H2"}]]];var jy=["svg",t,[["path",{d:"M7 21h10"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}]]];var Xy=["svg",t,[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2"}],["polyline",{points:"17 2 12 7 7 2"}]]];var Ky=["svg",t,[["path",{d:"M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"}]]];var Yy=["svg",t,[["path",{d:"M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"}]]];var Jy=["svg",t,[["polyline",{points:"4 7 4 4 20 4 20 7"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20"}]]];var Qy=["svg",t,[["path",{d:"M12 2v1"}],["path",{d:"M15.5 21a1.85 1.85 0 0 1-3.5-1v-8H2a10 10 0 0 1 3.428-6.575"}],["path",{d:"M17.5 12H22A10 10 0 0 0 9.004 3.455"}],["path",{d:"m2 2 20 20"}]]];var tM=["svg",t,[["path",{d:"M22 12a10.06 10.06 1 0 0-20 0Z"}],["path",{d:"M12 12v8a2 2 0 0 0 4 0"}],["path",{d:"M12 2v1"}]]];var eM=["svg",t,[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20"}]]];var aM=["svg",t,[["path",{d:"M9 14 4 9l5-5"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"}]]];var rM=["svg",t,[["circle",{cx:"12",cy:"17",r:"1"}],["path",{d:"M3 7v6h6"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"}]]];var oM=["svg",t,[["path",{d:"M3 7v6h6"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"}]]];var sM=["svg",t,[["path",{d:"M16 12h6"}],["path",{d:"M8 12H2"}],["path",{d:"M12 2v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 20v2"}],["path",{d:"m19 15 3-3-3-3"}],["path",{d:"m5 9-3 3 3 3"}]]];var iM=["svg",t,[["path",{d:"M12 22v-6"}],["path",{d:"M12 8V2"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}],["path",{d:"m15 19-3 3-3-3"}],["path",{d:"m15 5-3-3-3 3"}]]];var nM=["svg",t,[["rect",{width:"8",height:"6",x:"5",y:"4",rx:"1"}],["rect",{width:"8",height:"6",x:"11",y:"14",rx:"1"}]]];var lM=["svg",t,[["path",{d:"M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2"}]]];var dM=["svg",t,[["path",{d:"m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"}],["path",{d:"m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"}],["line",{x1:"8",x2:"8",y1:"2",y2:"5"}],["line",{x1:"2",x2:"5",y1:"8",y2:"8"}],["line",{x1:"16",x2:"16",y1:"19",y2:"22"}],["line",{x1:"19",x2:"22",y1:"16",y2:"16"}]]];var cM=["svg",t,[["circle",{cx:"12",cy:"16",r:"1"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2"}],["path",{d:"M7 10V7a5 5 0 0 1 9.33-2.5"}]]];var pM=["svg",t,[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1"}]]];var fM=["svg",t,[["path",{d:"m19 5 3-3"}],["path",{d:"m2 22 3-3"}],["path",{d:"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"}],["path",{d:"M7.5 13.5 10 11"}],["path",{d:"M10.5 16.5 13 14"}],["path",{d:"m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"}]]];var hM=["svg",t,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M12 12v9"}],["path",{d:"m16 16-4-4-4 4"}]]];var uM=["svg",t,[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{points:"17 8 12 3 7 8"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15"}]]];var mM=["svg",t,[["circle",{cx:"10",cy:"7",r:"1"}],["circle",{cx:"4",cy:"20",r:"1"}],["path",{d:"M4.7 19.3 19 5"}],["path",{d:"m21 3-3 1 2 2Z"}],["path",{d:"M9.26 7.68 5 12l2 5"}],["path",{d:"m10 14 5 2 3.5-3.5"}],["path",{d:"m18 12 1-1 1 1-1 1Z"}]]];var xM=["svg",t,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["polyline",{points:"16 11 18 13 22 9"}]]];var gM=["svg",t,[["circle",{cx:"18",cy:"15",r:"3"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M10 15H6a4 4 0 0 0-4 4v2"}],["path",{d:"m21.7 16.4-.9-.3"}],["path",{d:"m15.2 13.9-.9-.3"}],["path",{d:"m16.6 18.7.3-.9"}],["path",{d:"m19.1 12.2.3-.9"}],["path",{d:"m19.6 18.7-.4-1"}],["path",{d:"m16.8 12.3-.4-1"}],["path",{d:"m14.3 16.6 1-.4"}],["path",{d:"m20.7 13.8 1-.4"}]]];var vM=["svg",t,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11"}]]];var yM=["svg",t,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11"}]]];var _e=["svg",t,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"m16 19 2 2 4-4"}]]];var ze=["svg",t,[["path",{d:"M2 21a8 8 0 0 1 10.434-7.62"}],["circle",{cx:"10",cy:"8",r:"5"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m19.5 14.3-.4.9"}],["path",{d:"m16.9 20.8-.4.9"}],["path",{d:"m21.7 19.5-.9-.4"}],["path",{d:"m15.2 16.9-.9-.4"}],["path",{d:"m21.7 16.5-.9.4"}],["path",{d:"m15.2 19.1-.9.4"}],["path",{d:"m19.5 21.7-.4-.9"}],["path",{d:"m16.9 15.2-.4-.9"}]]];var je=["svg",t,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M22 19h-6"}]]];var Xe=["svg",t,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M19 16v6"}],["path",{d:"M22 19h-6"}]]];var MM=["svg",t,[["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M2 21a8 8 0 0 1 10.434-7.62"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.9-1.9"}]]];var Ke=["svg",t,[["path",{d:"M2 21a8 8 0 0 1 11.873-7"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"m17 17 5 5"}],["path",{d:"m22 17-5 5"}]]];var Ye=["svg",t,[["circle",{cx:"12",cy:"8",r:"5"}],["path",{d:"M20 21a8 8 0 0 0-16 0"}]]];var bM=["svg",t,[["circle",{cx:"10",cy:"7",r:"4"}],["path",{d:"M10.3 15H7a4 4 0 0 0-4 4v2"}],["circle",{cx:"17",cy:"17",r:"3"}],["path",{d:"m21 21-1.9-1.9"}]]];var SM=["svg",t,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13"}]]];var AM=["svg",t,[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{cx:"12",cy:"7",r:"4"}]]];var Je=["svg",t,[["path",{d:"M18 21a8 8 0 0 0-16 0"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"}]]];var wM=["svg",t,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75"}]]];var CM=["svg",t,[["path",{d:"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"}],["path",{d:"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"}],["path",{d:"m2.1 21.8 6.4-6.3"}],["path",{d:"m19 5-7 7"}]]];var LM=["svg",t,[["path",{d:"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"}],["path",{d:"M7 2v20"}],["path",{d:"M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"}]]];var EM=["svg",t,[["path",{d:"M12 2v20"}],["path",{d:"M2 5h20"}],["path",{d:"M3 3v2"}],["path",{d:"M7 3v2"}],["path",{d:"M17 3v2"}],["path",{d:"M21 3v2"}],["path",{d:"m19 5-7 7-7-7"}]]];var kM=["svg",t,[["path",{d:"M8 21s-4-3-4-9 4-9 4-9"}],["path",{d:"M16 3s4 3 4 9-4 9-4 9"}],["line",{x1:"15",x2:"9",y1:"9",y2:"15"}],["line",{x1:"9",x2:"15",y1:"9",y2:"15"}]]];var PM=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}],["path",{d:"m7.9 7.9 2.7 2.7"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor"}],["path",{d:"m13.4 10.6 2.7-2.7"}],["circle",{cx:"7.5",cy:"16.5",r:".5",fill:"currentColor"}],["path",{d:"m7.9 16.1 2.7-2.7"}],["circle",{cx:"16.5",cy:"16.5",r:".5",fill:"currentColor"}],["path",{d:"m13.4 13.4 2.7 2.7"}],["circle",{cx:"12",cy:"12",r:"2"}]]];var TM=["svg",t,[["path",{d:"M2 2a26.6 26.6 0 0 1 10 20c.9-6.82 1.5-9.5 4-14"}],["path",{d:"M16 8c4 0 6-2 6-6-4 0-6 2-6 6"}],["path",{d:"M17.41 3.6a10 10 0 1 0 3 3"}]]];var DM=["svg",t,[["path",{d:"M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"}],["path",{d:"M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"}],["path",{d:"M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"}]]];var HM=["svg",t,[["path",{d:"m2 8 2 2-2 2 2 2-2 2"}],["path",{d:"m22 8-2 2 2 2-2 2 2 2"}],["path",{d:"M8 8v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2"}],["path",{d:"M16 10.34V6c0-.55-.45-1-1-1h-4.34"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var FM=["svg",t,[["path",{d:"m2 8 2 2-2 2 2 2-2 2"}],["path",{d:"m22 8-2 2 2 2-2 2 2 2"}],["rect",{width:"8",height:"14",x:"8",y:"5",rx:"1"}]]];var VM=["svg",t,[["path",{d:"M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"}],["path",{d:"M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var BM=["svg",t,[["path",{d:"m22 8-6 4 6 4V8Z"}],["rect",{width:"14",height:"12",x:"2",y:"6",rx:"2",ry:"2"}]]];var RM=["svg",t,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M2 8h20"}],["circle",{cx:"8",cy:"14",r:"2"}],["path",{d:"M8 12h8"}],["circle",{cx:"16",cy:"14",r:"2"}]]];var IM=["svg",t,[["path",{d:"M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z"}],["path",{d:"M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"}]]];var $M=["svg",t,[["circle",{cx:"6",cy:"12",r:"4"}],["circle",{cx:"18",cy:"12",r:"4"}],["line",{x1:"6",x2:"18",y1:"16",y2:"16"}]]];var OM=["svg",t,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"}]]];var NM=["svg",t,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"}],["path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14"}]]];var qM=["svg",t,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15"}]]];var WM=["svg",t,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}]]];var ZM=["svg",t,[["path",{d:"m9 12 2 2 4-4"}],["path",{d:"M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"}],["path",{d:"M22 19H2"}]]];var UM=["svg",t,[["path",{d:"M17 14h.01"}],["path",{d:"M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"}]]];var GM=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"}],["path",{d:"M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"}]]];var _M=["svg",t,[["path",{d:"M21 12V7H5a2 2 0 0 1 0-4h14v4"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h16v-5"}],["path",{d:"M18 12a2 2 0 0 0 0 4h4v-4Z"}]]];var zM=["svg",t,[["circle",{cx:"8",cy:"9",r:"2"}],["path",{d:"m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}]]];var jM=["svg",t,[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"}],["path",{d:"m14 7 3 3"}],["path",{d:"M5 6v4"}],["path",{d:"M19 14v4"}],["path",{d:"M10 2v2"}],["path",{d:"M7 8H3"}],["path",{d:"M21 16h-4"}],["path",{d:"M11 3H9"}]]];var XM=["svg",t,[["path",{d:"M15 4V2"}],["path",{d:"M15 16v-2"}],["path",{d:"M8 9h2"}],["path",{d:"M20 9h2"}],["path",{d:"M17.8 11.8 19 13"}],["path",{d:"M15 9h0"}],["path",{d:"M17.8 6.2 19 5"}],["path",{d:"m3 21 9-9"}],["path",{d:"M12.2 6.2 11 5"}]]];var KM=["svg",t,[["path",{d:"M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"}],["path",{d:"M6 18h12"}],["path",{d:"M6 14h12"}],["rect",{width:"12",height:"12",x:"6",y:"10"}]]];var YM=["svg",t,[["path",{d:"M3 6h3"}],["path",{d:"M17 6h.01"}],["rect",{width:"18",height:"20",x:"3",y:"2",rx:"2"}],["circle",{cx:"12",cy:"13",r:"5"}],["path",{d:"M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"}]]];var JM=["svg",t,[["circle",{cx:"12",cy:"12",r:"6"}],["polyline",{points:"12 10 12 12 13 13"}],["path",{d:"m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"}],["path",{d:"m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"}]]];var QM=["svg",t,[["path",{d:"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}]]];var t6=["svg",t,[["circle",{cx:"12",cy:"4.5",r:"2.5"}],["path",{d:"m10.2 6.3-3.9 3.9"}],["circle",{cx:"4.5",cy:"12",r:"2.5"}],["path",{d:"M7 12h10"}],["circle",{cx:"19.5",cy:"12",r:"2.5"}],["path",{d:"m13.8 17.7 3.9-3.9"}],["circle",{cx:"12",cy:"19.5",r:"2.5"}]]];var e6=["svg",t,[["circle",{cx:"12",cy:"10",r:"8"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 22h10"}],["path",{d:"M12 22v-4"}]]];var a6=["svg",t,[["path",{d:"M17 17h-5c-1.09-.02-1.94.92-2.5 1.9A3 3 0 1 1 2.57 15"}],["path",{d:"M9 3.4a4 4 0 0 1 6.52.66"}],["path",{d:"m6 17 3.1-5.8a2.5 2.5 0 0 0 .057-2.05"}],["path",{d:"M20.3 20.3a4 4 0 0 1-2.3.7"}],["path",{d:"M18.6 13a4 4 0 0 1 3.357 3.414"}],["path",{d:"m12 6 .6 1"}],["path",{d:"m2 2 20 20"}]]];var r6=["svg",t,[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"}]]];var o6=["svg",t,[["circle",{cx:"12",cy:"5",r:"3"}],["path",{d:"M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"}]]];var s6=["svg",t,[["path",{d:"m2 22 10-10"}],["path",{d:"m16 8-1.17 1.17"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"m8 8-.53.53a3.5 3.5 0 0 0 0 4.94L9 15l1.53-1.53c.55-.55.88-1.25.98-1.97"}],["path",{d:"M10.91 5.26c.15-.26.34-.51.56-.73L13 3l1.53 1.53a3.5 3.5 0 0 1 .28 4.62"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"m16 16-.53.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.49 3.49 0 0 1 1.97-.98"}],["path",{d:"M18.74 13.09c.26-.15.51-.34.73-.56L21 11l-1.53-1.53a3.5 3.5 0 0 0-4.62-.28"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var i6=["svg",t,[["path",{d:"M2 22 16 8"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}]]];var n6=["svg",t,[["circle",{cx:"7",cy:"12",r:"3"}],["path",{d:"M10 9v6"}],["circle",{cx:"17",cy:"12",r:"3"}],["path",{d:"M14 7v8"}],["path",{d:"M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"}]]];var l6=["svg",t,[["path",{d:"M12 20h.01"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764"}],["path",{d:"m2 2 20 20"}]]];var d6=["svg",t,[["path",{d:"M12 20h.01"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}]]];var c6=["svg",t,[["path",{d:"M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"}],["path",{d:"M9.6 4.6A2 2 0 1 1 11 8H2"}],["path",{d:"M12.6 19.4A2 2 0 1 0 14 16H2"}]]];var p6=["svg",t,[["path",{d:"M8 22h8"}],["path",{d:"M7 10h3m7 0h-1.343"}],["path",{d:"M12 15v7"}],["path",{d:"M7.307 7.307A12.33 12.33 0 0 0 7 10a5 5 0 0 0 7.391 4.391M8.638 2.981C8.75 2.668 8.872 2.34 9 2h6c1.5 4 2 6 2 8 0 .407-.05.809-.145 1.198"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var f6=["svg",t,[["path",{d:"M8 22h8"}],["path",{d:"M7 10h10"}],["path",{d:"M12 15v7"}],["path",{d:"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"}]]];var h6=["svg",t,[["rect",{width:"8",height:"8",x:"3",y:"3",rx:"2"}],["path",{d:"M7 11v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"8",x:"13",y:"13",rx:"2"}]]];var u6=["svg",t,[["line",{x1:"3",x2:"21",y1:"6",y2:"6"}],["path",{d:"M3 12h15a3 3 0 1 1 0 6h-4"}],["polyline",{points:"16 16 14 18 16 20"}],["line",{x1:"3",x2:"10",y1:"18",y2:"18"}]]];var m6=["svg",t,[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"}]]];var x6=["svg",t,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];var g6=["svg",t,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];var v6=["svg",t,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];var y6=["svg",t,[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]]];var M6=["svg",t,[["path",{d:"M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"}],["path",{d:"m10 15 5-3-5-3z"}]]];var b6=["svg",t,[["polyline",{points:"12.41 6.75 13 2 10.57 4.92"}],["polyline",{points:"18.57 12.91 21 10 15.66 10"}],["polyline",{points:"8 8 3 14 12 14 11 22 16 16"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];var S6=["svg",t,[["polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"}]]];var A6=["svg",t,[["circle",{cx:"11",cy:"11",r:"8"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11"}]]];var w6=["svg",t,[["circle",{cx:"11",cy:"11",r:"8"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11"}]]];var C6=({icons:E={},nameAttr:o="data-lucide",attrs:e={}}={})=>{if(!Object.values(E).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof document=="undefined")throw new Error("`createIcons()` only works in a browser environment.");let a=document.querySelectorAll(`[${o}]`);if(Array.from(a).forEach(r=>r8(r,{nameAttr:o,icons:E,attrs:e})),o==="data-lucide"){let r=document.querySelectorAll("[icon-name]");r.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(r).forEach(s=>r8(s,{nameAttr:"icon-name",icons:E,attrs:e})))}};var s8=lt(require("obsidian"));var Et=require("obsidian");var mt=require("obsidian");var L6=class{constructor(o,e,a,r){this.app=o,this.sceneManager=e,this.characterManager=a,this.locationManager=r}async export(o,e){let a=this.sceneManager.activeProject;if(!a){new mt.Notice("No active project");return}let r=this.getSortedScenes();if(r.length===0){new mt.Notice("No scenes to export");return}switch(o){case"md":return this.exportMarkdown(a,r,e);case"json":return this.exportJson(a,r,e);case"pdf":return this.exportPdf(a,r,e);case"csv":return this.exportCsv(a,r,e)}}getSortedScenes(){return this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"})}timestamp(){let o=new Date;return`${o.getFullYear()}-${String(o.getMonth()+1).padStart(2,"0")}-${String(o.getDate()).padStart(2,"0")}`}async exportMarkdown(o,e,a){let r=[];r.push(`# ${o.title}`),r.push(""),a==="manuscript"?this.buildManuscriptMd(r,e):this.buildOutlineMd(r,e);let s=`${o.title} - ${a==="manuscript"?"Manuscript":"Outline"} (${this.timestamp()}).md`,n=await this.writeExportFile(o,s,r.join(`
`));return new mt.Notice(`Exported to ${s}`),n}buildManuscriptMd(o,e){let a,r;for(let s of e)s.act!==void 0&&s.act!==a&&(a=s.act,o.push(`## Act ${a}`),o.push(""),r=void 0),s.chapter!==void 0&&s.chapter!==r&&(r=s.chapter,o.push(`### Chapter ${r}`),o.push("")),o.push(`#### ${s.title||"Untitled Scene"}`),o.push(""),s.body&&s.body.trim()?(o.push(s.body.trim()),o.push("")):(o.push("*No content yet.*"),o.push("")),o.push("---"),o.push("")}buildOutlineMd(o,e){var c,p,f,g,u,h,y;let a=e.reduce((x,m)=>x+(m.wordcount||0),0),r={};for(let x of e){let m=x.status||"idea";r[m]=(r[m]||0)+1}o.push(`**Scenes:** ${e.length}  `),o.push(`**Total words:** ${a.toLocaleString()}  `);let s=Object.entries(r).map(([x,m])=>{var v;return`${((v=z[x])==null?void 0:v.label)||x}: ${m}`}).join(" | ");o.push(`**Status:** ${s}`),o.push(""),o.push("| # | Title | Act | Ch | Chrono | Status | POV | Location | Words | Emotion | Intensity | Conflict | Tags | Timeline Mode | Strand | Notes |"),o.push("|---|-------|-----|----|--------|--------|-----|----------|-------|---------|-----------|----------|------|---------------|--------|-------|");for(let x of e){let m=(c=x.sequence)!=null?c:"",v=x.title||"Untitled",M=(p=x.act)!=null?p:"",b=(f=x.chapter)!=null?f:"",A=(g=x.chronologicalOrder)!=null?g:"",S=((u=z[x.status])==null?void 0:u.label)||x.status||"",L=x.pov||"",C=(x.location||"").replace(/\|/g,"/"),w=(h=x.wordcount)!=null?h:"",k=x.emotion||"",T=(y=x.intensity)!=null?y:"",H=(x.conflict||"").replace(/\|/g,"/"),V=(x.tags||[]).join(", "),R=(x.notes||"").replace(/\|/g,"/").replace(/\n/g," "),P=x.timeline_mode||"",F=x.timeline_strand||"";o.push(`| ${m} | ${v} | ${M} | ${b} | ${A} | ${S} | ${L} | ${C} | ${w} | ${k} | ${T} | ${H} | ${V} | ${P} | ${F} | ${R} |`)}o.push("");let n=new Set;for(let x of e)x.pov&&n.add(x.pov),x.characters&&x.characters.forEach(m=>n.add(m));if(n.size>0){o.push("## Characters"),o.push("");let x=this.characterManager.getAllCharacters();if(x.length>0)for(let m of x)o.push(`### ${m.name}`),o.push(""),m.role&&o.push(`**Role:** ${m.role}  `),m.age&&o.push(`**Age:** ${m.age}  `),m.occupation&&o.push(`**Occupation:** ${m.occupation}  `),m.personality&&o.push(`**Personality:** ${m.personality}  `),m.formativeMemories&&o.push(`**Backstory:** ${m.formativeMemories}  `),m.startingPoint&&o.push(`**Starting point:** ${m.startingPoint}  `),m.goal&&o.push(`**Goal:** ${m.goal}  `),m.expectedChange&&o.push(`**Expected change:** ${m.expectedChange}  `),m.internalMotivation&&o.push(`**Internal motivation:** ${m.internalMotivation}  `),m.externalMotivation&&o.push(`**External motivation:** ${m.externalMotivation}  `),m.allies&&o.push(`**Allies:** ${m.allies}  `),m.enemies&&o.push(`**Enemies:** ${m.enemies}  `),o.push("");else o.push(Array.from(n).sort().join(", ")),o.push("")}let i=this.locationManager.getAllWorlds(),l=this.locationManager.getAllLocations();if(i.length>0||l.length>0){o.push("## Worlds & Locations"),o.push("");for(let m of i){o.push(`### \u{1F30D} ${m.name}`),o.push(""),m.description&&o.push(`${m.description}  `),m.geography&&o.push(`**Geography:** ${m.geography}  `),m.culture&&o.push(`**Culture:** ${m.culture}  `),m.politics&&o.push(`**Politics:** ${m.politics}  `),m.magicTechnology&&o.push(`**Magic/Technology:** ${m.magicTechnology}  `),m.history&&o.push(`**History:** ${m.history}  `),o.push("");let v=this.locationManager.getLocationsForWorld(m.name);for(let M of v)this.appendLocationMd(o,M,"####")}let x=this.locationManager.getOrphanLocations();for(let m of x)this.appendLocationMd(o,m,"###")}let d=new Set;for(let x of e)x.tags&&x.tags.forEach(m=>d.add(m));d.size>0&&(o.push("## Plotlines / Tags"),o.push(""),o.push(Array.from(d).sort().join(", ")),o.push(""))}appendLocationMd(o,e,a){let r=e.locationType?` (${e.locationType})`:"";o.push(`${a} \u{1F4CD} ${e.name}${r}`),o.push(""),e.description&&o.push(`${e.description}  `),e.atmosphere&&o.push(`**Atmosphere:** ${e.atmosphere}  `),e.significance&&o.push(`**Significance:** ${e.significance}  `),e.inhabitants&&o.push(`**Inhabitants:** ${e.inhabitants}  `),e.parent&&o.push(`**Inside:** ${e.parent}  `),o.push("")}async exportJson(o,e,a){let r;a==="manuscript"?r={project:o.title,exported:new Date().toISOString(),scenes:e.map(i=>({title:i.title,act:i.act,chapter:i.chapter,sequence:i.sequence,chronologicalOrder:i.chronologicalOrder,body:i.body||""}))}:r={project:o.title,exported:new Date().toISOString(),totalScenes:e.length,totalWords:e.reduce((i,l)=>i+(l.wordcount||0),0),scenes:e.map(i=>({title:i.title,filePath:i.filePath,act:i.act,chapter:i.chapter,sequence:i.sequence,chronologicalOrder:i.chronologicalOrder,status:i.status,pov:i.pov,characters:i.characters,location:i.location,storyDate:i.storyDate,storyTime:i.storyTime,conflict:i.conflict,emotion:i.emotion,intensity:i.intensity,wordcount:i.wordcount,target_wordcount:i.target_wordcount,tags:i.tags,setup_scenes:i.setup_scenes,payoff_scenes:i.payoff_scenes,notes:i.notes,timeline_mode:i.timeline_mode,timeline_strand:i.timeline_strand})),characters:this.characterManager.getAllCharacters().map(i=>{let l={name:i.name};return i.role&&(l.role=i.role),i.age&&(l.age=i.age),i.occupation&&(l.occupation=i.occupation),i.personality&&(l.personality=i.personality),i.formativeMemories&&(l.backstory=i.formativeMemories),i.startingPoint&&(l.startingPoint=i.startingPoint),i.goal&&(l.goal=i.goal),i.expectedChange&&(l.expectedChange=i.expectedChange),i.internalMotivation&&(l.internalMotivation=i.internalMotivation),i.externalMotivation&&(l.externalMotivation=i.externalMotivation),i.appearance&&(l.appearance=i.appearance),i.strengths&&(l.strengths=i.strengths),i.flaws&&(l.flaws=i.flaws),i.fears&&(l.fears=i.fears),i.allies&&(l.allies=i.allies),i.enemies&&(l.enemies=i.enemies),i.custom&&Object.keys(i.custom).length&&(l.custom=i.custom),l}),worlds:this.locationManager.getAllWorlds().map(i=>{let l={name:i.name};return i.description&&(l.description=i.description),i.geography&&(l.geography=i.geography),i.culture&&(l.culture=i.culture),i.politics&&(l.politics=i.politics),i.magicTechnology&&(l.magicTechnology=i.magicTechnology),i.history&&(l.history=i.history),l.locations=this.locationManager.getLocationsForWorld(i.name).map(d=>d.name),l}),locations:this.locationManager.getAllLocations().map(i=>{let l={name:i.name};return i.locationType&&(l.type=i.locationType),i.world&&(l.world=i.world),i.parent&&(l.parent=i.parent),i.description&&(l.description=i.description),i.atmosphere&&(l.atmosphere=i.atmosphere),i.significance&&(l.significance=i.significance),i.inhabitants&&(l.inhabitants=i.inhabitants),i.custom&&Object.keys(i.custom).length&&(l.custom=i.custom),l})};let s=`${o.title} - ${a==="manuscript"?"Manuscript":"Outline"} (${this.timestamp()}).json`,n=await this.writeExportFile(o,s,JSON.stringify(r,null,2));return new mt.Notice(`Exported to ${s}`),n}async exportPdf(o,e,a){let r=this.buildPdfHtml(o,e,a),s=`${o.title} - ${a==="manuscript"?"Manuscript":"Outline"} (${this.timestamp()}).html`,n=await this.writeExportFile(o,s,r),i=window.open("","_blank");return i?(i.document.write(r),i.document.close(),setTimeout(()=>{i.print()},400),new mt.Notice(`Exported to ${s}`),n):(new mt.Notice(`Saved as ${s} \u2014 open it in a browser to print as PDF`),n)}buildPdfHtml(o,e,a){let r=this.escHtml(o.title),s=a==="manuscript"?this.buildManuscriptHtml(e):this.buildOutlineHtml(e);return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${r}</title>
<style>
    @page { margin: 2cm; }
    body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #222;
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 { font-size: 24pt; margin-bottom: 0.5em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 18pt; margin-top: 1.5em; color: #444; }
    h3 { font-size: 14pt; margin-top: 1.2em; color: #555; }
    h4 { font-size: 12pt; margin-top: 1em; font-style: italic; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .stats { font-size: 11pt; color: #555; margin-bottom: 1em; }
    .no-content { color: #999; font-style: italic; }
    @media print {
        body { padding: 0; }
        h1 { page-break-after: avoid; }
        h2, h3 { page-break-after: avoid; }
        .scene-block { page-break-inside: avoid; }
    }
</style>
</head>
<body>
<h1>${r}</h1>
${s}
</body>
</html>`}buildManuscriptHtml(o){let e=[],a,r;for(let s of o){if(s.act!==void 0&&s.act!==a&&(a=s.act,e.push(`<h2>Act ${this.escHtml(String(a))}</h2>`),r=void 0),s.chapter!==void 0&&s.chapter!==r&&(r=s.chapter,e.push(`<h3>Chapter ${this.escHtml(String(r))}</h3>`)),e.push('<div class="scene-block">'),e.push(`<h4>${this.escHtml(s.title||"Untitled Scene")}</h4>`),s.body&&s.body.trim()){let n=s.body.trim().split(/\n{2,}/);for(let i of n)e.push(`<p>${this.escHtml(i.trim())}</p>`)}else e.push('<p class="no-content">No content yet.</p>');e.push("</div>"),e.push("<hr>")}return e.join(`
`)}buildOutlineHtml(o){var r,s,n,i,l,d;let e=[],a=o.reduce((c,p)=>c+(p.wordcount||0),0);e.push('<div class="stats">'),e.push(`<strong>Scenes:</strong> ${o.length} &nbsp;&bull;&nbsp; <strong>Words:</strong> ${a.toLocaleString()}`),e.push("</div>"),e.push("<table>"),e.push("<tr><th>#</th><th>Chrono</th><th>Title</th><th>Act</th><th>Ch</th><th>Status</th><th>POV</th><th>Location</th><th>Words</th><th>Emotion</th><th>Mode</th><th>Conflict</th></tr>");for(let c of o)e.push("<tr>"),e.push(`<td>${(r=c.sequence)!=null?r:""}</td>`),e.push(`<td>${(s=c.chronologicalOrder)!=null?s:""}</td>`),e.push(`<td>${this.escHtml(c.title||"Untitled")}</td>`),e.push(`<td>${(n=c.act)!=null?n:""}</td>`),e.push(`<td>${(i=c.chapter)!=null?i:""}</td>`),e.push(`<td>${this.escHtml(((l=z[c.status])==null?void 0:l.label)||c.status||"")}</td>`),e.push(`<td>${this.escHtml(c.pov||"")}</td>`),e.push(`<td>${this.escHtml(c.location||"")}</td>`),e.push(`<td>${(d=c.wordcount)!=null?d:""}</td>`),e.push(`<td>${this.escHtml(c.emotion||"")}</td>`),e.push(`<td>${this.escHtml(c.timeline_mode||"")}</td>`),e.push(`<td>${this.escHtml(c.conflict||"")}</td>`),e.push("</tr>");return e.push("</table>"),e.join(`
`)}async exportCsv(o,e,a){var l,d,c,p,f,g,u,h,y,x,m,v,M;let r=[];if(a==="outline"){r.push(["Sequence","Chronological Order","Title","Act","Chapter","Status","POV","Location","Characters","Emotion","Intensity","Word Count","Target Words","Conflict","Tags","Story Date","Story Time","Setup Scenes","Payoff Scenes","Timeline Mode","Timeline Strand","Notes"]);for(let S of e)r.push([String((l=S.sequence)!=null?l:""),String((d=S.chronologicalOrder)!=null?d:""),S.title||"Untitled",String((c=S.act)!=null?c:""),String((p=S.chapter)!=null?p:""),((f=z[S.status])==null?void 0:f.label)||S.status||"",S.pov||"",S.location||"",(S.characters||[]).join("; "),S.emotion||"",String((g=S.intensity)!=null?g:""),String((u=S.wordcount)!=null?u:""),String((h=S.target_wordcount)!=null?h:""),S.conflict||"",(S.tags||[]).join("; "),S.storyDate||"",S.storyTime||"",(S.setup_scenes||[]).join("; "),(S.payoff_scenes||[]).join("; "),S.timeline_mode||"",S.timeline_strand||"",S.notes||""]);let b=this.characterManager.getAllCharacters();if(b.length>0){r.push([]),r.push(["--- Characters ---"]),r.push(["Name","Role","Age","Occupation","Personality","Backstory","Starting Point","Goal","Expected Change","Internal Motivation","External Motivation","Allies","Enemies"]);for(let S of b)r.push([S.name,S.role||"",String((y=S.age)!=null?y:""),S.occupation||"",S.personality||"",S.formativeMemories||"",S.startingPoint||"",S.goal||"",S.expectedChange||"",S.internalMotivation||"",S.externalMotivation||"",Array.isArray(S.allies)?S.allies.join(", "):S.allies||"",Array.isArray(S.enemies)?S.enemies.join(", "):S.enemies||""])}let A=this.locationManager.getAllLocations();if(A.length>0){r.push([]),r.push(["--- Locations ---"]),r.push(["Name","Type","Description","Significance"]);for(let S of A)r.push([S.name,S.type||"",S.description||"",S.significance||""])}}else{r.push(["Sequence","Chronological Order","Title","Act","Chapter","Body"]);for(let b of e)r.push([String((x=b.sequence)!=null?x:""),String((m=b.chronologicalOrder)!=null?m:""),b.title||"Untitled",String((v=b.act)!=null?v:""),String((M=b.chapter)!=null?M:""),b.body||""])}let s=r.map(b=>b.map(A=>this.csvEscape(A)).join(",")).join(`
`),n=`${o.title} - ${a==="manuscript"?"Manuscript":"Outline"} (${this.timestamp()}).csv`,i=await this.writeExportFile(o,n,s);return new mt.Notice(`CSV exported \u2192 ${i}`),i}csvEscape(o){return o.includes(",")||o.includes('"')||o.includes(`
`)||o.includes("\r")?`"${o.replace(/"/g,'""')}"`:o}async writeExportFile(o,e,a){let s=`${o.sceneFolder.replace(/\/Scenes\/?$/,"")}/Exports`;this.app.vault.getAbstractFileByPath(s)||await this.app.vault.createFolder(s);let i=`${s}/${e}`,l=this.app.vault.getAbstractFileByPath(i);return l instanceof mt.TFile?await this.app.vault.modify(l,a):await this.app.vault.create(i,a),i}escHtml(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}};var Dt=class extends Et.Modal{constructor(e){super(e.app);this.format="md";this.exportScope="outline";this.plugin=e,this.exportService=new L6(e.app,e.sceneManager,e.characterManager,e.locationManager)}onOpen(){let{contentEl:e}=this;e.empty(),e.addClass("storyline-export-modal"),e.createEl("h2",{text:"Export Project"});let a=this.plugin.sceneManager.activeProject;if(!a){e.createEl("p",{text:"No active project. Open a project first."});return}e.createEl("p",{text:`Project: ${a.title}`,cls:"storyline-export-project-name"}),new Et.Setting(e).setName("Content").setDesc("What to include in the export").addDropdown(i=>{i.addOption("outline","Outline (metadata, stats, table)"),i.addOption("manuscript","Manuscript (scene text in order)"),i.setValue(this.exportScope),i.onChange(l=>{this.exportScope=l})}),new Et.Setting(e).setName("Format").addDropdown(i=>{i.addOption("md","Markdown (.md)"),i.addOption("json","JSON (.json)"),i.addOption("csv","CSV (.csv)"),i.addOption("pdf","PDF (print dialog)"),i.setValue(this.format),i.onChange(l=>{this.format=l})});let r=e.createDiv({cls:"storyline-export-actions"}),s=r.createEl("button",{text:"Export",cls:"mod-cta"});s.setAttr("type","button"),s.addEventListener("click",async()=>{s.disabled=!0,s.textContent="Exporting\u2026";try{await this.exportService.export(this.format,this.exportScope),this.close()}catch(i){new Et.Notice("Export failed: "+String(i)),s.disabled=!1,s.textContent="Export"}});let n=r.createEl("button",{text:"Cancel"});n.setAttr("type","button"),n.addEventListener("click",()=>this.close())}onClose(){this.contentEl.empty()}};var N8=[{type:nt,label:"Board",icon:"layout-grid"},{type:Mt,label:"Plotgrid",icon:"table"},{type:xt,label:"Timeline",icon:"clock"},{type:gt,label:"Plotlines",icon:"git-branch"},{type:vt,label:"Characters",icon:"users"},{type:bt,label:"Locations",icon:"map-pin"},{type:yt,label:"Stats",icon:"bar-chart-2"}];function at(E,o,e,a){let r=E.createDiv("story-line-view-switcher");for(let i of N8){let l=r.createEl("button",{cls:`story-line-view-tab ${i.type===o?"active":""}`,attr:{"aria-label":i.label,title:i.label}}),d=l.createSpan({cls:"view-tab-icon"});s8.setIcon(d,i.icon),l.createSpan({cls:"view-tab-label",text:i.label}),i.type!==o&&l.addEventListener("click",async c=>{c.preventDefault();try{await a.setViewState({type:i.type,active:!0,state:{}}),e.app.workspace.revealLeaf(a)}catch(p){console.error("StoryLine: view switch failed, falling back",p),e.activateView(i.type)}})}let s=r.createEl("button",{cls:"story-line-view-tab story-line-export-btn",attr:{"aria-label":"Export",title:"Export"}}),n=s.createSpan({cls:"view-tab-icon"});return s8.setIcon(n,"download"),s.createSpan({cls:"view-tab-label",text:"Export"}),s.addEventListener("click",i=>{i.preventDefault(),new Dt(e).open()}),r}var q8='button, a, input, select, textarea, [contenteditable], .clickable-icon, .is-clickable, [draggable="true"]';function Ht(E){let o=!1,e=0,a=0,r=0,s=0,n=!1,i=-1,l=!1,d=g=>{l=g.button===1;let u=g.button===0;!l&&!u||u&&g.target.closest(q8)||(o=!0,n=!1,e=g.clientX,a=g.clientY,r=E.scrollLeft,s=E.scrollTop,i=g.pointerId,l&&(E.setPointerCapture(g.pointerId),g.preventDefault()))},c=4,p=g=>{if(!o)return;let u=g.clientX-e,h=g.clientY-a;if(!n){if(Math.abs(u)<c&&Math.abs(h)<c)return;n=!0,E.classList.add("sl-panning"),i>=0&&E.setPointerCapture(i)}E.scrollLeft=r-u,E.scrollTop=s-h},f=g=>{if(!o)return;let u=n;o=!1,n=!1,i=-1,E.classList.remove("sl-panning");try{E.releasePointerCapture(g.pointerId)}catch(h){}if(u){let h=y=>{y.stopPropagation(),y.preventDefault()};E.addEventListener("click",h,{capture:!0,once:!0})}};return E.addEventListener("pointerdown",d),E.addEventListener("pointermove",p),E.addEventListener("pointerup",f),E.addEventListener("pointercancel",f),()=>{E.removeEventListener("pointerdown",d),E.removeEventListener("pointermove",p),E.removeEventListener("pointerup",f),E.removeEventListener("pointercancel",f),E.classList.remove("sl-panning")}}var i8=120,x8=40;function E6(E=""){return E+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}var k6=class extends q.ItemView{constructor(e,a){super(e);this.data={rows:[],columns:[],cells:{},zoom:1};this.saveDebounce=null;this.wrapperEl=null;this.scrollAreaEl=null;this.canvasEl=null;this.selectedRow=null;this.selectedCol=null;this.inspectorComponent=null;this.inspectorEl=null;this.plugin=a}getViewType(){return Mt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"Plot Grid"}async onOpen(){let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-board-container"),this.containerEl.addClass("plot-grid-root"),await this.loadData(),this.buildLayout(e),this.renderToolbar(),this.renderGrid(),this.registerEvent(this.app.vault.on("rename",(a,r)=>{if(a instanceof q.TFile){let s=!1;for(let n of Object.keys(this.data.cells)){let i=this.data.cells[n];i&&i.linkedSceneId===r&&(i.linkedSceneId=a.path,s=!0)}s&&(this.scheduleSave(),this.renderGrid())}}))}async onClose(){}async loadData(){try{let e=null;this.plugin&&typeof this.plugin.loadPlotGrid=="function"?e=await this.plugin.loadPlotGrid():e=null,e&&typeof e=="object"?this.data={rows:e.rows||[],columns:e.columns||[],cells:e.cells||{},zoom:typeof e.zoom=="number"?e.zoom:1}:this.data={rows:[],columns:[],cells:{},zoom:1}}catch(e){this.data={rows:[],columns:[],cells:{},zoom:1}}}scheduleSave(){let e=this.plugin;e&&(this.saveDebounce&&window.clearTimeout(this.saveDebounce),this.saveDebounce=window.setTimeout(async()=>{try{typeof e.savePlotGrid=="function"&&await e.savePlotGrid(this.data)}catch(a){}this.saveDebounce=null},500))}buildLayout(e){var s;this.wrapperEl=e.createDiv("plot-grid-wrapper"),this.wrapperEl.style.display="flex",this.wrapperEl.style.flexDirection="column",this.wrapperEl.style.height="100%",this.wrapperEl.tabIndex=0,this.wrapperEl.addEventListener("keydown",n=>this.onKeyDown(n));let a=this.wrapperEl.createDiv("story-line-toolbar plot-grid-toolbar");a.style.flex="0 0 auto",a.style.padding="8px",this.scrollAreaEl=this.wrapperEl.createDiv("plot-grid-scroll-area"),this.scrollAreaEl.style.flex="1 1 auto",this.scrollAreaEl.style.overflow="auto",this.scrollAreaEl.style.position="relative",Ht(this.scrollAreaEl),this.canvasEl=this.scrollAreaEl.createDiv("plot-grid-canvas"),this.canvasEl.style.position="relative",this.canvasEl.style.transformOrigin="top left",this.canvasEl.style.width="100%",this.canvasEl.style.boxSizing="border-box",this.inspectorEl=this.wrapperEl.createDiv("story-line-inspector-panel"),this.inspectorEl.style.display="none";let r=(s=this.plugin)==null?void 0:s.sceneManager;r&&this.plugin&&(this.inspectorComponent=new wt(this.inspectorEl,this.plugin,r,{onEdit:n=>this.openScene(n),onDelete:n=>this.deleteScene(n),onStatusChange:async(n,i)=>{await r.updateScene(n.filePath,{status:i}),this.renderGrid()}}))}renderToolbar(){if(!this.wrapperEl)return;let e=this.wrapperEl.querySelector(".plot-grid-toolbar");e.empty(),e.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),this.plugin&&at(e,Mt,this.plugin,this.leaf);let r=e.createDiv("story-line-toolbar-controls");r.style.marginLeft="24px";let s=r.createDiv("plot-grid-toolbar-left");s.style.display="flex",s.style.alignItems="center",s.style.gap="2px";let n=r.createDiv("plot-grid-toolbar-actions");n.style.display="flex",n.style.gap="2px",n.style.marginLeft="auto";try{if(!document.getElementById("storyline-plotgrid-toolbar-style")){let A=document.createElement("style");A.id="storyline-plotgrid-toolbar-style",A.textContent=`
                /* Apply identical toolbar icon styling to both icon-button and clickable-icon */
                .plot-grid-toolbar .icon-button, .plot-grid-toolbar .clickable-icon { background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 2px !important; min-width: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
                .plot-grid-toolbar .icon-button:focus, .plot-grid-toolbar .clickable-icon:focus { outline: none !important; box-shadow: none !important; }
                /* Do not force explicit icon pixel sizes here \u2014 inherit the application's default icon sizing (use BoardView sizing as reference). */
                .plot-grid-toolbar .icon-button i[data-lucide], .plot-grid-toolbar .icon-button svg, .plot-grid-toolbar .clickable-icon i[data-lucide], .plot-grid-toolbar .clickable-icon svg { display: inline-flex !important; align-items: center !important; justify-content: center !important; }
                .plot-grid-toolbar .icon-button:hover, .plot-grid-toolbar .clickable-icon:hover { background-color: var(--sl-hover-overlay2) !important; border-radius: 6px !important; }
                .plot-grid-toolbar .icon-button:active i, .plot-grid-toolbar .icon-button:active svg, .plot-grid-toolbar .clickable-icon:active i, .plot-grid-toolbar .clickable-icon:active svg { transform: scale(0.96) !important; }
                `,document.head.appendChild(A)}}catch(A){}let i=s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Add Row"}});i.title="Add Row",typeof X.setIcon=="function"?X.setIcon(i,"rows-3"):i.innerHTML='<i data-lucide="rows-3" aria-hidden="true"></i>',i.addEventListener("click",()=>{this.addRow()});let l=s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Add Column"}});l.title="Add Column",typeof X.setIcon=="function"?X.setIcon(l,"columns-3"):l.innerHTML='<i data-lucide="columns-3" aria-hidden="true"></i>',l.addEventListener("click",()=>{this.addColumn()});let d=n.createDiv("plot-grid-formatting-group");d.style.display="flex",d.style.gap="2px";let c=d.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Toggle bold for selected cell"}});c.title="Toggle bold for selected cell",typeof X.setIcon=="function"?X.setIcon(c,"bold"):c.innerHTML='<i data-lucide="bold" aria-hidden="true"></i>',c.addEventListener("click",()=>this.toggleBoldSelected());let p=d.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Toggle italic for selected cell"}});p.title="Toggle italic for selected cell",typeof X.setIcon=="function"?X.setIcon(p,"italic"):p.innerHTML='<i data-lucide="italic" aria-hidden="true"></i>',p.addEventListener("click",()=>this.toggleItalicSelected());let f=d.createEl("select"),g=f.createEl("option",{text:"Left",value:"left"}),u=f.createEl("option",{text:"Center",value:"center"}),h=f.createEl("option",{text:"Right",value:"right"});f.title="Alignment for selection",f.addEventListener("change",()=>this.setAlignSelected(f.value)),f.value="center";let y=d.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Set background color for selected cell"}});y.title="Set background color for selected cell",typeof X.setIcon=="function"?X.setIcon(y,"palette"):y.innerHTML='<i data-lucide="palette" aria-hidden="true"></i>',y.addEventListener("click",()=>this.setCellBgColorSelected());let x=d.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Set text color for selected cell"}});x.title="Set text color for selected cell",typeof X.setIcon=="function"?X.setIcon(x,"paintbrush"):x.innerHTML='<i data-lucide="paintbrush" aria-hidden="true"></i>',x.addEventListener("click",()=>this.setCellTextColorSelected());let m=n.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Zoom out"}});m.title="Zoom out",typeof X.setIcon=="function"?X.setIcon(m,"zoom-out"):m.innerHTML='<i data-lucide="zoom-out" aria-hidden="true"></i>',m.addEventListener("click",()=>this.setZoom(Math.max(.3,this.data.zoom-.1)));let v=n.createEl("span",{cls:"plot-grid-zoom-label",text:Math.round(this.data.zoom*100)+"%"});v.style.display="inline-block",v.style.width="40px",v.style.minWidth="40px",v.style.textAlign="center",v.style.alignSelf="center",v.style.cursor="text",v.title="Click to edit zoom %",v.addEventListener("click",A=>{A.stopPropagation();let S=document.createElement("input");S.type="text",S.value=Math.round(this.data.zoom*100).toString(),S.style.width="56px",S.addEventListener("keydown",L=>{if(L.key==="Enter"){let C=Number(S.value);!isNaN(C)&&C>0&&this.setZoom(Math.min(200,Math.max(30,C))/100),this.renderToolbar()}else L.key==="Escape"&&this.renderToolbar()}),S.addEventListener("blur",()=>this.renderToolbar()),v.replaceWith(S),S.focus(),S.select()});let M=n.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Reset zoom to 100%"}});M.title="Reset zoom to 100%",typeof X.setIcon=="function"?X.setIcon(M,"maximize-2"):M.innerHTML='<i data-lucide="maximize-2" aria-hidden="true"></i>',M.addEventListener("click",()=>this.setZoom(1));let b=n.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Zoom in"}});b.title="Zoom in",typeof X.setIcon=="function"?X.setIcon(b,"zoom-in"):b.innerHTML='<i data-lucide="zoom-in" aria-hidden="true"></i>',b.addEventListener("click",()=>this.setZoom(Math.min(2,this.data.zoom+.1))),n.appendChild(m),n.appendChild(v),n.appendChild(b),n.appendChild(M);try{if(typeof C6=="function"){let A=Qe||o8;try{C6({icons:A})}catch(S){}}}catch(A){}try{e.querySelectorAll(".icon-button").forEach(S=>{let L=S;L.style.background="transparent",L.style.backgroundColor="transparent",L.style.backgroundImage="none",L.style.border="none",L.style.boxShadow="none",L.style.outline="none",L.style.minWidth="0",L.style.width="auto",L.style.height="auto",L.style.padding="2px",L.style.borderRadius="0";let C=L.querySelector("i[data-lucide]");if(C){C.style.display="inline-flex",C.style.alignItems="center",C.style.justifyContent="center",C.style.background="transparent",C.style.transition="transform 120ms ease, background-color 120ms ease, opacity 120ms ease";let w=C.querySelector("svg");w&&(w.style.transition="transform 120ms ease, opacity 120ms ease",w.style.opacity="0.95",w.style.display="block")}L.addEventListener("mouseenter",()=>{try{L.style.backgroundColor="var(--sl-hover-overlay)",L.style.borderRadius="6px";let w=L.querySelector("i[data-lucide]");w&&(w.style.transform="scale(1.08)")}catch(w){}}),L.addEventListener("mouseleave",()=>{try{L.style.background="transparent",L.style.backgroundColor="transparent",L.style.borderRadius="0";let w=L.querySelector("i[data-lucide]");w&&(w.style.transform="")}catch(w){}}),L.addEventListener("mousedown",()=>{try{let w=L.querySelector("i[data-lucide]");w&&(w.style.transform="scale(0.96)")}catch(w){}}),document.addEventListener("mouseup",()=>{try{let w=L.querySelector("i[data-lucide]");w&&(w.style.transform="")}catch(w){}})})}catch(A){}}setZoom(e){var s,n;if(this.data.zoom=e,this.canvasEl&&this.scrollAreaEl){this.canvasEl.style.transform=`scale(${e})`;let i=this.computeTotalWidth();this.canvasEl.style.width=i/e+"px"}this.scheduleSave();let a=((s=this.wrapperEl)==null?void 0:s.querySelector(".plot-grid-toolbar"))||((n=this.wrapperEl)==null?void 0:n.querySelector(".story-line-toolbar")),r=a==null?void 0:a.querySelector(".plot-grid-zoom-label");r&&(r.textContent=Math.round(e*100)+"%")}computeTotalWidth(){return i8+this.data.columns.reduce((e,a)=>e+a.width,0)}renderGrid(){var s,n;if(!this.canvasEl||!this.scrollAreaEl)return;this.ensureDefaults(),this.canvasEl.empty();let e=[i8+"px",...this.data.columns.map(i=>i.width+"px")].join(" "),a=[x8+"px",...this.data.rows.map(i=>i.height+"px")].join(" ");this.data.columns.length===0&&(e="1fr"),this.data.rows.length===0&&(a="1fr"),this.canvasEl.style.display="grid",this.canvasEl.style.gridTemplateColumns=e,this.canvasEl.style.gridTemplateRows=a,this.data.columns.length===0?this.canvasEl.style.width="100%":this.canvasEl.style.width=this.computeTotalWidth()/this.data.zoom+"px";let r=this.canvasEl.createDiv("plot-grid-corner");r.setAttr("data-type","corner"),r.style.position=this.data.stickyHeaders===!1?"relative":"sticky",r.style.top="0",r.style.left="0",r.style.zIndex="11",r.style.background="var(--background-modifier-hover)",r.style.border="1px solid var(--sl-border-subtle)",r.addEventListener("contextmenu",i=>{i.preventDefault();let l=new q.Menu;l.addItem(d=>d.setTitle("Reset Grid").onClick(()=>{class c extends q.Modal{constructor(g,u){super(g),this.onConfirm=u}onOpen(){let{contentEl:g}=this;g.createEl("h3",{text:"Reset Grid"}),g.createEl("p",{text:"Are you sure you want to reset the Grid? Resetting will delete everything."});let u=g.createDiv();u.createEl("button",{text:"Reset"}).addEventListener("click",()=>{this.onConfirm(),this.close()}),u.createEl("button",{text:"Cancel"}).addEventListener("click",()=>this.close())}}new c(this.app,()=>{this.data={rows:[],columns:[],cells:{},zoom:1},this.scheduleSave(),this.renderGrid()}).open()})),l.showAtMouseEvent(i)});for(let i=0;i<this.data.columns.length;i++){let l=this.data.columns[i],d=this.canvasEl.createDiv("plot-grid-col-header");d.style.position=this.data.stickyHeaders===!1?"relative":"sticky",d.style.top="0",d.style.zIndex="10",d.style.background=l.bgColor||"var(--background-secondary)",d.style.display="flex",d.style.alignItems="center",d.style.justifyContent="center",d.style.border="1px solid var(--sl-border-subtle)",d.style.userSelect="none",d.style.position="relative",d.textContent=l.label,l.textColor&&(d.style.color=l.textColor),l.bold&&(d.style.fontWeight="600"),l.italic&&(d.style.fontStyle="italic"),d.addEventListener("dblclick",p=>{p.stopPropagation();let f=document.createElement("input");f.type="text",f.value=l.label,f.style.width="100%",f.style.boxSizing="border-box",d.empty(),d.appendChild(f),f.focus();let g=()=>{l.label=f.value||l.label,this.scheduleSave(),this.renderGrid()};f.addEventListener("keydown",u=>{u.key==="Enter"?g():u.key==="Escape"&&this.renderGrid()}),f.addEventListener("blur",()=>g())}),d.addEventListener("click",p=>{p.stopPropagation(),this.selectColumnHeader(i)}),d.draggable=!0,d.addEventListener("dragstart",p=>{var f;(f=p.dataTransfer)==null||f.setData("text/plain",`col:${i}`)}),d.addEventListener("dragover",p=>{p.preventDefault()}),d.addEventListener("drop",p=>{var y;p.preventDefault();let f=(y=p.dataTransfer)==null?void 0:y.getData("text/plain");if(!f)return;let[g,u]=f.split(":"),h=Number(u);g==="col"&&!Number.isNaN(h)&&h!==i&&this.moveColumn(h,i)});let c=d.createDiv("plot-col-resize-handle");c.style.position="absolute",c.style.right="0",c.style.top="0",c.style.bottom="0",c.style.width="6px",c.style.cursor="col-resize",c.draggable=!1,c.addEventListener("mousedown",p=>{p.stopPropagation(),this.startColResize(p,i)}),d.addEventListener("contextmenu",p=>{p.preventDefault();let f=new q.Menu;f.addItem(g=>g.setTitle("Rename Column").onClick(()=>{let u=window.prompt("Rename column",l.label);u!==null&&(l.label=u,this.scheduleSave(),this.renderGrid())})),f.addItem(g=>g.setTitle((this.data.stickyHeaders?"Disable":"Enable")+" Sticky Headers").onClick(()=>{this.data.stickyHeaders=!this.data.stickyHeaders,this.scheduleSave(),this.renderGrid()})),f.addItem(g=>g.setTitle("Set Column Colour\u2026").onClick(()=>{var m;let u=(m=this.canvasEl)==null?void 0:m.querySelectorAll(".plot-grid-col-header")[i],h=[];for(let v=0;v<this.data.rows.length;v++){let M=this.getCellElement(v,i);M&&h.push(M)}let y=h.map(v=>v.style.background),x=u?u.style.background:null;this.chooseColor(this.data.columns[i].bgColor||this.defaultBgColor(),v=>{if(v===null){h.forEach((M,b)=>M.style.background=y[b]),u&&x!==null&&(u.style.background=x);return}this.data.columns[i].bgColor=v||"",this.scheduleSave(),this.renderGrid();for(let M=0;M<this.data.rows.length;M++)this.flashElement(this.getCellElement(M,i))},v=>{v===null?(h.forEach((M,b)=>M.style.background=y[b]),u&&x!==null&&(u.style.background=x)):(h.forEach(M=>M.style.background=v),u&&(u.style.background=v))})})),f.addSeparator(),f.addItem(g=>g.setTitle("Insert Column Left").onClick(()=>this.insertColumnAt(i,!0))),f.addItem(g=>g.setTitle("Insert Column Right").onClick(()=>this.insertColumnAt(i,!1))),f.addSeparator(),f.addItem(g=>g.setTitle("Delete Column").onClick(()=>this.deleteColumn(i))),f.showAtMouseEvent(p)})}for(let i=0;i<this.data.rows.length;i++){let l=this.data.rows[i],d=this.canvasEl.createDiv("plot-grid-row-header");d.style.position=this.data.stickyHeaders===!1?"relative":"sticky",d.style.left="0",d.style.zIndex="9",d.style.background=l.bgColor||"var(--background-secondary)",d.style.display="flex",d.style.alignItems="center",d.style.justifyContent="center",d.style.border="1px solid var(--sl-border-subtle)",d.style.userSelect="none",d.style.position="relative",d.textContent=l.label,l.textColor&&(d.style.color=l.textColor),l.bold&&(d.style.fontWeight="600"),l.italic&&(d.style.fontStyle="italic"),d.addEventListener("dblclick",p=>{p.stopPropagation();let f=document.createElement("input");f.type="text",f.value=l.label,f.style.width="100%",f.style.boxSizing="border-box",d.empty(),d.appendChild(f),f.focus();let g=()=>{l.label=f.value||l.label,this.scheduleSave(),this.renderGrid()};f.addEventListener("keydown",u=>{u.key==="Enter"?g():u.key==="Escape"&&this.renderGrid()}),f.addEventListener("blur",()=>g())}),d.addEventListener("click",p=>{p.stopPropagation(),this.selectRowHeader(i)}),d.draggable=!0,d.addEventListener("dragstart",p=>{var f;(f=p.dataTransfer)==null||f.setData("text/plain",`row:${i}`)}),d.addEventListener("dragover",p=>{p.preventDefault()}),d.addEventListener("drop",p=>{var y;p.preventDefault();let f=(y=p.dataTransfer)==null?void 0:y.getData("text/plain");if(!f)return;let[g,u]=f.split(":"),h=Number(u);g==="row"&&!Number.isNaN(h)&&h!==i&&this.moveRow(h,i)});let c=d.createDiv("plot-row-resize-handle");c.style.position="absolute",c.style.left="0",c.style.right="0",c.style.bottom="0",c.style.height="6px",c.style.cursor="row-resize",c.draggable=!1,c.addEventListener("mousedown",p=>{p.stopPropagation(),this.startRowResize(p,i)}),d.addEventListener("contextmenu",p=>{p.preventDefault();let f=new q.Menu;f.addItem(g=>g.setTitle("Rename Row").onClick(()=>{let u=window.prompt("Rename row",l.label);u!==null&&(l.label=u,this.scheduleSave(),this.renderGrid())})),f.addItem(g=>g.setTitle((this.data.stickyHeaders?"Disable":"Enable")+" Sticky Headers").onClick(()=>{this.data.stickyHeaders=!this.data.stickyHeaders,this.scheduleSave(),this.renderGrid()})),f.addItem(g=>g.setTitle("Set Row Colour\u2026").onClick(()=>{var m;let u=[];for(let v=0;v<this.data.columns.length;v++){let M=this.getCellElement(i,v);M&&u.push(M)}let h=u.map(v=>v.style.background),y=(m=this.canvasEl)==null?void 0:m.querySelectorAll(".plot-grid-row-header")[i],x=y?y.style.background:null;this.chooseColor(this.data.rows[i].bgColor||this.defaultBgColor(),v=>{if(v===null){u.forEach((M,b)=>M.style.background=h[b]),y&&x!==null&&(y.style.background=x);return}this.data.rows[i].bgColor=v||"",this.scheduleSave(),this.renderGrid();for(let M=0;M<this.data.columns.length;M++)this.flashElement(this.getCellElement(i,M))},v=>{v===null?(u.forEach((M,b)=>M.style.background=h[b]),y&&x!==null&&(y.style.background=x)):(u.forEach(M=>M.style.background=v),y&&(y.style.background=v))})})),f.addSeparator(),f.addItem(g=>g.setTitle("Insert Row Above").onClick(()=>this.insertRowAt(i,!0))),f.addItem(g=>g.setTitle("Insert Row Below").onClick(()=>this.insertRowAt(i,!1))),f.addSeparator(),f.addItem(g=>g.setTitle("Delete Row").onClick(()=>this.deleteRow(i))),f.showAtMouseEvent(p)});for(let p=0;p<this.data.columns.length;p++){let f=this.data.columns[p],g=`${l.id}-${f.id}`,u=this.data.cells[g];u||(u={id:g,content:"",bgColor:"",textColor:"",bold:!1,italic:!1,align:"center"},this.data.cells[g]=u),u.align||(u.align="center");let h=this.canvasEl.createDiv("plot-grid-cell");h.setAttr("data-row",String(i)),h.setAttr("data-col",String(p)),h.style.minHeight=l.height+"px",h.style.border="1px solid var(--sl-grid-border)",h.style.padding="6px 8px",h.style.boxSizing="border-box",h.style.whiteSpace="pre-wrap",h.style.overflow="hidden",h.style.cursor="default",h.style.display="flex",h.style.flexDirection="column",h.style.justifyContent="center";let y=u.bgColor||l.bgColor||f.bgColor||"";y&&(h.style.background=y),u.textColor&&(h.style.color=u.textColor),u.bold&&(h.style.fontWeight="600"),u.italic&&(h.style.fontStyle="italic"),h.style.textAlign=u.align;let x=h.createDiv();if(x.textContent=u.content||"",x.style.flex="1 1 auto",x.style.pointerEvents="none",u.linkedSceneId){let m=(s=this.plugin)==null?void 0:s.sceneManager,v=m==null?void 0:m.getScene(u.linkedSceneId);if(v){let M=h.createDiv("plot-grid-mini-card"),b=M.createDiv("pg-mini-title-row"),A=z[v.status||"idea"],S=b.createSpan({cls:"pg-mini-status-icon"});X.setIcon(S,A.icon),S.title=A.label,b.createSpan({cls:"pg-mini-title",text:v.title||"Untitled"});let L=M.createDiv("pg-mini-meta");if(v.body&&v.body.trim()){let C=v.body.trim().length>120?v.body.trim().substring(0,120)+"\u2026":v.body.trim();L.createSpan({cls:"pg-mini-desc",text:C})}else v.conflict&&L.createSpan({cls:"pg-mini-desc",text:v.conflict});u.content?(x.style.marginTop="4px",x.style.fontSize="11px",x.style.color="var(--text-muted)"):x.style.display="none"}else{let M=h.createDiv("plot-grid-linked-badge");M.textContent="\u{1F517}",M.title=u.linkedSceneId,M.style.position="absolute",M.style.top="4px",M.style.right="6px",M.style.cursor="pointer",M.addEventListener("click",A=>{A.stopPropagation();let S=this.app.vault.getAbstractFileByPath(u.linkedSceneId);S?this.app.workspace.getLeaf("tab").openFile(S):new q.Notice("Linked file not found")});let b=h.createDiv("plot-grid-linked-subtitle");b.textContent=((n=u.linkedSceneId.split("/").pop())==null?void 0:n.replace(".md",""))||"",b.style.fontSize="11px",b.style.color="var(--text-muted)"}}h.addEventListener("dblclick",m=>{m.stopPropagation(),this.enterEditMode(h,u,x)}),h.addEventListener("click",()=>{var m;if(this.selectCell(h),u.linkedSceneId&&this.inspectorComponent){let v=(m=this.plugin)==null?void 0:m.sceneManager,M=v==null?void 0:v.getScene(u.linkedSceneId);M&&this.inspectorComponent.show(M)}else this.inspectorComponent&&this.inspectorComponent.hide()}),h.addEventListener("contextmenu",m=>{var A;m.preventDefault();let v=new q.Menu,M=(A=this.plugin)==null?void 0:A.sceneManager,b=u.linkedSceneId?M==null?void 0:M.getScene(u.linkedSceneId):void 0;b?(v.addItem(L=>L.setTitle("Open Scene").setIcon("file-text").onClick(()=>this.openScene(b))),v.addItem(L=>L.setTitle("Show in Inspector").setIcon("info").onClick(()=>{var C;(C=this.inspectorComponent)==null||C.show(b)})),v.addSeparator(),["idea","outlined","draft","written","revised","final"].forEach(L=>{v.addItem(C=>C.setTitle(`Status: ${L.charAt(0).toUpperCase()+L.slice(1)}`).setChecked(b.status===L).onClick(async()=>{await(M==null?void 0:M.updateScene(b.filePath,{status:L})),this.renderGrid()}))}),v.addSeparator(),v.addItem(L=>L.setTitle("Duplicate Scene").setIcon("copy").onClick(async()=>{await(M==null?void 0:M.duplicateScene(b.filePath)),this.renderGrid()})),v.addItem(L=>L.setTitle("Edit Cell Text").onClick(()=>this.enterEditMode(h,u,x))),v.addItem(L=>L.setTitle("Unlink Scene").setIcon("unlink").onClick(()=>{let C=this.data.cells[g];C&&(C.linkedSceneId=void 0),this.scheduleSave(),this.renderGrid()})),v.addItem(L=>L.setTitle("Delete Scene").setIcon("trash").onClick(async()=>{ct(this.app,{title:"Delete Scene",message:`Delete scene "${b.title||"Untitled"}"?`,confirmLabel:"Delete",onConfirm:async()=>{await this.deleteScene(b);let C=this.data.cells[g];C&&(C.linkedSceneId=void 0),this.scheduleSave()}})}))):(v.addItem(S=>S.setTitle("Edit Cell").onClick(()=>this.enterEditMode(h,u,x))),v.addSeparator(),M&&v.addItem(S=>S.setTitle("Create New Scene\u2026").setIcon("plus").onClick(()=>{this.openQuickAddForCell(g)})),v.addItem(S=>S.setTitle("Link Scene Card\u2026").setIcon("link").onClick(()=>{this.openSceneLinkModal(L=>{let C=this.data.cells[g];C&&(C.linkedSceneId=L),this.scheduleSave(),this.renderGrid()})})),v.addSeparator(),v.addItem(S=>S.setTitle("Clear Cell Content").onClick(()=>{let L=this.data.cells[g];L&&(L.content=""),this.scheduleSave(),this.renderGrid()}))),v.addSeparator(),v.addItem(S=>S.setTitle("Insert Row Above").onClick(()=>this.insertRowAt(i,!0))),v.addItem(S=>S.setTitle("Insert Row Below").onClick(()=>this.insertRowAt(i,!1))),v.addItem(S=>S.setTitle("Insert Column Left").onClick(()=>this.insertColumnAt(p,!0))),v.addItem(S=>S.setTitle("Insert Column Right").onClick(()=>this.insertColumnAt(p,!1))),v.addSeparator(),v.addItem(S=>S.setTitle("Delete Row").onClick(()=>this.deleteRow(i))),v.addItem(S=>S.setTitle("Delete Column").onClick(()=>this.deleteColumn(p))),v.showAtMouseEvent(m)}),h.addEventListener("dragover",m=>{m.preventDefault(),h.addClass("plot-grid-drop-target")}),h.addEventListener("dragleave",()=>{h.removeClass("plot-grid-drop-target")}),h.addEventListener("drop",m=>{var M;m.preventDefault(),h.removeClass("plot-grid-drop-target");let v=(M=m.dataTransfer)==null?void 0:M.getData("text/scene-path");if(v){let b=this.data.cells[g];b&&(b.linkedSceneId=v),this.scheduleSave(),this.renderGrid()}})}}if(this.setZoom(this.data.zoom||1),this.data.rows.length===0&&this.data.columns.length===0){let i=this.canvasEl.createDiv("plot-grid-empty");i.style.position="relative",i.style.width="100%",i.style.display="flex",i.style.alignItems="center",i.style.justifyContent="center",i.style.padding="24px",i.style.boxSizing="border-box",i.style.maxWidth="100%",i.style.textAlign="left",i.textContent="Use 'Add Row' and 'Add Column' to begin building your plot grid."}this.applySelectionVisuals()}async refresh(){var e;try{if(this.saveDebounce||(e=this.canvasEl)!=null&&e.querySelector(".plot-grid-cell.editing")||(await this.loadData(),!this.wrapperEl))return;this.renderToolbar(),this.renderGrid()}catch(a){}}applySelectionVisuals(){if(this.canvasEl){if(this.canvasEl.querySelectorAll(".plot-grid-cell").forEach(e=>e.style.outline=""),this.canvasEl.querySelectorAll(".plot-grid-row-header, .plot-grid-col-header").forEach(e=>e.style.boxShadow=""),this.selectedRow!==null&&this.selectedCol!==null){let e=this.getCellElement(this.selectedRow,this.selectedCol);e&&(e.style.outline="2px solid var(--interactive-accent)")}if(this.selectedRow!==null){let e=this.canvasEl.querySelectorAll(".plot-grid-row-header")[this.selectedRow];e&&(e.style.boxShadow="inset 4px 0 0 var(--interactive-accent)")}if(this.selectedCol!==null){let e=this.canvasEl.querySelectorAll(".plot-grid-col-header")[this.selectedCol];e&&(e.style.boxShadow="inset 0 4px 0 var(--interactive-accent)")}}}flashElement(e){if(!e)return;let a=e.style.transition||"";e.style.transition="background-color 160ms ease";let r=e.style.background;e.style.background="var(--sl-grid-flash)",setTimeout(()=>{e.style.background=r,setTimeout(()=>{e.style.transition=a},200)},180)}selectCell(e){var n;let a=(n=this.canvasEl)==null?void 0:n.querySelector(".plot-grid-cell.selected");a&&(a.classList.remove("selected"),a.style.outline=""),e.classList.add("selected");let r=e.getAttribute("data-row"),s=e.getAttribute("data-col");this.selectedRow=r?Number(r):null,this.selectedCol=s?Number(s):null,e.scrollIntoView({block:"nearest",inline:"nearest"}),e.style.outline="2px solid var(--interactive-accent)",this.applySelectionVisuals()}getCellElement(e,a){var r,s;return(s=(r=this.canvasEl)==null?void 0:r.querySelector(`.plot-grid-cell[data-row="${e}"][data-col="${a}"]`))!=null?s:null}moveSelection(e,a){if(this.selectedRow===null||this.selectedCol===null)if(this.data.rows.length>0&&this.data.columns.length>0)this.selectedRow=0,this.selectedCol=0;else return;let r=Math.max(0,Math.min(this.data.rows.length-1,this.selectedRow+a)),s=Math.max(0,Math.min(this.data.columns.length-1,this.selectedCol+e)),n=this.getCellElement(r,s);n&&this.selectCell(n)}onKeyDown(e){var r;if(!(!this.wrapperEl||(r=this.canvasEl)!=null&&r.querySelector(".plot-grid-cell.editing")))switch(e.key){case"ArrowRight":e.preventDefault(),this.moveSelection(1,0);break;case"ArrowLeft":e.preventDefault(),this.moveSelection(-1,0);break;case"ArrowDown":e.preventDefault(),this.moveSelection(0,1);break;case"ArrowUp":e.preventDefault(),this.moveSelection(0,-1);break;case"Tab":e.preventDefault(),e.shiftKey?this.moveSelection(-1,0):this.moveSelection(1,0);break;case"Enter":if(e.preventDefault(),this.selectedRow!==null&&this.selectedCol!==null){let s=this.getCellElement(this.selectedRow,this.selectedCol),n=`${this.data.rows[this.selectedRow].id}-${this.data.columns[this.selectedCol].id}`,i=this.data.cells[n];s&&i&&this.enterEditMode(s,i,s.querySelector("div"))}break}}getSelectedCellKey(){if(this.selectedRow===null||this.selectedCol===null)return null;let e=this.data.rows[this.selectedRow],a=this.data.columns[this.selectedCol];return!e||!a?null:`${e.id}-${a.id}`}getSelectedCellData(){let e=this.getSelectedCellKey();if(!e)return null;let a=this.data.cells[e],r=this.getCellElement(this.selectedRow,this.selectedCol);return!a||!r?null:{key:e,cell:a,el:r}}selectRowHeader(e){var s,n,i;this.selectedRow=e,this.selectedCol=null,(s=this.canvasEl)==null||s.querySelectorAll(".plot-grid-row-header.selected").forEach(l=>l.classList.remove("selected")),(((n=this.canvasEl)==null?void 0:n.querySelectorAll(".plot-grid-cell"))||[]).forEach(l=>l.classList.remove("selected"));let r=(i=this.canvasEl)==null?void 0:i.querySelectorAll(".plot-grid-row-header")[e];r&&r.classList.add("selected")}selectColumnHeader(e){var s,n,i;this.selectedCol=e,this.selectedRow=null,(s=this.canvasEl)==null||s.querySelectorAll(".plot-grid-col-header.selected").forEach(l=>l.classList.remove("selected")),(((n=this.canvasEl)==null?void 0:n.querySelectorAll(".plot-grid-cell"))||[]).forEach(l=>l.classList.remove("selected"));let r=(i=this.canvasEl)==null?void 0:i.querySelectorAll(".plot-grid-col-header")[e];r&&r.classList.add("selected")}moveArrayItem(e,a,r){let s=e.splice(a,1)[0];e.splice(r,0,s)}moveColumn(e,a){e!==a&&(this.moveArrayItem(this.data.columns,e,a),this.selectedCol===e?this.selectedCol=a:this.selectedCol!==null&&(e<a&&this.selectedCol>e&&this.selectedCol<=a?this.selectedCol--:e>a&&this.selectedCol>=a&&this.selectedCol<e&&this.selectedCol++),this.scheduleSave(),this.renderGrid())}moveRow(e,a){e!==a&&(this.moveArrayItem(this.data.rows,e,a),this.selectedRow===e?this.selectedRow=a:this.selectedRow!==null&&(e<a&&this.selectedRow>e&&this.selectedRow<=a?this.selectedRow--:e>a&&this.selectedRow>=a&&this.selectedRow<e&&this.selectedRow++),this.scheduleSave(),this.renderGrid())}resolveThemeColor(e,a){return getComputedStyle(document.body).getPropertyValue(e).trim()||a}defaultBgColor(){return this.resolveThemeColor("--background-primary","#ffffff")}defaultTextColor(){return this.resolveThemeColor("--text-normal","#000000")}getThemePalette(){return[this.resolveThemeColor("--sl-palette-1","#fde8d8"),this.resolveThemeColor("--sl-palette-2","#fdf6d8"),this.resolveThemeColor("--sl-palette-3","#d8f5e0"),this.resolveThemeColor("--sl-palette-4","#d8eafd"),this.resolveThemeColor("--sl-palette-5","#ead8fd"),this.resolveThemeColor("--sl-palette-6","#fdd8e8"),this.resolveThemeColor("--sl-palette-7","#d8f5f5"),this.resolveThemeColor("--sl-palette-8","#f5d8d8"),this.resolveThemeColor("--sl-palette-9","#e8e8e8"),""]}chooseColor(e,a,r){let s=this.app,n=this.getThemePalette(),i=this.resolveThemeColor("--sl-checker-light","#fff"),l=this.resolveThemeColor("--sl-checker-dark","#ddd");class d extends q.Modal{constructor(g,u,h,y){super(g);this.inputEl=null;this.hexEl=null;this.initVal=u,this.onChoose=h,this.onPreview=y}onOpen(){let{contentEl:g}=this,u=g.createEl("h3",{text:"Choose color"});u.style.margin="4px 0 8px 0";let h=g.createDiv();this.inputEl=h.createEl("input"),this.inputEl.type="color";let y=this.initVal&&/^#?[0-9a-fA-F]{6}$/.test(this.initVal)?this.initVal.startsWith("#")?this.initVal:`#${this.initVal}`:getComputedStyle(document.body).getPropertyValue("--background-primary").trim()||"#ffffff";this.inputEl.value=y,this.inputEl.style.width="48px",this.inputEl.style.height="32px",this.inputEl.style.marginRight="8px",this.hexEl=h.createEl("input"),this.hexEl.type="text",this.hexEl.value=this.initVal&&this.initVal!==""?this.initVal.startsWith("#")?this.initVal:`#${this.initVal}`:"",this.hexEl.style.width="120px",this.hexEl.style.marginRight="8px";let x=h.createDiv("color-preview");x.style.width="36px",x.style.height="36px",x.style.border="1px solid var(--background-modifier-border)",x.style.background=this.inputEl.value,x.style.marginRight="10px",x.style.borderRadius="6px";let m=this.initVal&&this.initVal!==""?this.initVal.startsWith("#")?this.initVal:`#${this.initVal}`:"",v=g.createDiv("color-swatch-row");v.style.display="flex",v.style.flexWrap="wrap",v.style.gap="6px",v.style.marginTop="6px";for(let C of n){let w=v.createDiv("palette-swatch");w.style.width="20px",w.style.height="20px",w.style.borderRadius="4px",w.style.border="1px solid var(--background-modifier-border)",w.style.cursor="pointer",w.title=C||"No color",w.style.background=C||"transparent",C||(w.style.backgroundImage=`linear-gradient(45deg,${i} 25%, ${l} 25%, ${l} 50%, ${i} 50%, ${i} 75%, ${l} 75%, ${l} 100%)`,w.style.backgroundSize="8px 8px"),w.addEventListener("click",()=>{if(C){m=C;try{this.inputEl.value=C}catch(k){}this.hexEl&&(this.hexEl.value=C),x.style.background=C,this.onPreview&&this.onPreview(C)}else m="",this.hexEl&&(this.hexEl.value=""),x.style.background="transparent",this.onPreview&&this.onPreview("")})}g.style.maxWidth="90vw",g.style.padding="8px 12px",g.style.marginTop="0";let M=this.modalEl;M&&(M.style.width="300px",M.style.maxWidth="90vw",M.style.left="50%",M.style.top="4%",M.style.transform="translate(-52%, -6%)",M.style.right="auto",M.style.boxSizing="border-box",M.style.margin="0"),this.inputEl.addEventListener("input",()=>{let C=this.inputEl.value;m=C,this.hexEl&&(this.hexEl.value=C),x.style.background=C,this.onPreview&&this.onPreview(C)}),this.hexEl.addEventListener("input",()=>{let C=this.hexEl.value;if(C==="")m="",x.style.background="transparent",this.onPreview&&this.onPreview("");else if(/^#?[0-9a-fA-F]{6}$/.test(C)){let w=C.startsWith("#")?C:`#${C}`;m=w;try{this.inputEl.value=w}catch(k){}x.style.background=w,this.onPreview&&this.onPreview(w)}});let b=g.createDiv();b.style.marginTop="8px",b.style.display="flex",b.style.width="100%",b.style.justifyContent="flex-end",b.style.gap="12px",b.style.paddingRight="6px",b.createEl("button",{text:"OK"}).addEventListener("click",()=>{this.onChoose(m===""?"":m),this.close()}),b.createEl("button",{text:"Cancel"}).addEventListener("click",()=>{this.onPreview&&this.onPreview(null),this.onChoose(null),this.close()});let L=g.querySelector("h3");if(M&&L){L.style.cursor="move";let C=!1,w=0,k=0,T=0,H=0,V=F=>{F.preventDefault(),C=!0;let I=M.getBoundingClientRect();w=F.clientX,k=F.clientY,T=I.left,H=I.top,M.style.position="fixed",M.style.left=T+"px",M.style.top=H+"px",M.style.transform="",document.addEventListener("mousemove",R),document.addEventListener("mouseup",P)},R=F=>{if(!C)return;let I=F.clientX-w,et=F.clientY-k;M.style.left=T+I+"px",M.style.top=H+et+"px"},P=()=>{C=!1,document.removeEventListener("mousemove",R),document.removeEventListener("mouseup",P)};L.addEventListener("mousedown",V),M.addEventListener("mousedown",F=>{let I=F.target;if(I.closest("h3")||I.closest("input")||I.closest("button")||I.closest(".color-swatch-row"))return;let et=M.getBoundingClientRect(),D=F.clientY-et.top;D>=0&&D<=56&&V(F)}),M.addEventListener("mousemove",F=>{let I=F.target,et=M.getBoundingClientRect(),D=F.clientY-et.top;D>=0&&D<=56&&!I.closest("input")&&!I.closest("button")&&!I.closest(".color-swatch-row")?M.style.cursor="move":M.style.cursor=""}),M.addEventListener("mouseleave",()=>{M.style.cursor=""})}}}new d(s,e||this.defaultBgColor(),a,r).open()}toggleBoldSelected(){var r,s;let e=this.selectedRow,a=this.selectedCol;if(e!==null&&a!==null){let n=this.getSelectedCellData();if(!n){new q.Notice("Select a cell first");return}n.cell.bold=!n.cell.bold,this.flashElement(n.el)}else if(e!==null){let n=this.data.rows[e];n.bold=!n.bold;let i=(r=this.canvasEl)==null?void 0:r.querySelectorAll(".plot-grid-row-header")[e];i&&this.flashElement(i)}else if(a!==null){let n=this.data.columns[a];n.bold=!n.bold;let i=(s=this.canvasEl)==null?void 0:s.querySelectorAll(".plot-grid-col-header")[a];i&&this.flashElement(i)}else{new q.Notice("Select a cell, row, or column first");return}this.scheduleSave(),this.renderGrid()}toggleItalicSelected(){var r,s;let e=this.selectedRow,a=this.selectedCol;if(e!==null&&a!==null){let n=this.getSelectedCellData();if(!n){new q.Notice("Select a cell first");return}n.cell.italic=!n.cell.italic,this.flashElement(n.el)}else if(e!==null){let n=this.data.rows[e];n.italic=!n.italic;let i=(r=this.canvasEl)==null?void 0:r.querySelectorAll(".plot-grid-row-header")[e];i&&this.flashElement(i)}else if(a!==null){let n=this.data.columns[a];n.italic=!n.italic;let i=(s=this.canvasEl)==null?void 0:s.querySelectorAll(".plot-grid-col-header")[a];i&&this.flashElement(i)}else{new q.Notice("Select a cell, row, or column first");return}this.scheduleSave(),this.renderGrid()}setAlignSelected(e){let a=this.selectedRow,r=this.selectedCol;if(a!==null&&r!==null){let s=this.getSelectedCellData();if(!s){new q.Notice("Select a cell first");return}s.cell.align=e,this.flashElement(s.el)}else if(a!==null){for(let s=0;s<this.data.columns.length;s++){let n=`${this.data.rows[a].id}-${this.data.columns[s].id}`,i=this.data.cells[n];i&&(i.align=e)}for(let s=0;s<this.data.columns.length;s++)this.flashElement(this.getCellElement(a,s))}else if(r!==null){for(let s=0;s<this.data.rows.length;s++){let n=`${this.data.rows[s].id}-${this.data.columns[r].id}`,i=this.data.cells[n];i&&(i.align=e)}for(let s=0;s<this.data.rows.length;s++)this.flashElement(this.getCellElement(s,r))}else{new q.Notice("Select a cell, row, or column first");return}this.scheduleSave(),this.renderGrid()}setCellBgColorSelected(){var r,s;let e=this.selectedRow,a=this.selectedCol;if(e!==null&&a!==null){let n=this.getSelectedCellData();if(!n){new q.Notice("Select a cell first");return}let i=n.key,l=n.el,d=l.style.background;this.chooseColor(n.cell.bgColor||this.defaultBgColor(),c=>{if(c===null){l.style.background=d;return}let p=this.data.cells[i];p&&(p.bgColor=c||""),this.scheduleSave(),this.renderGrid();let f=this.getCellElement(e,a);f&&this.flashElement(f)},c=>{c===null?l.style.background=d:l.style.background=c})}else if(e!==null){let n=[];for(let c=0;c<this.data.columns.length;c++){let p=this.getCellElement(e,c);p&&n.push(p)}let i=n.map(c=>c.style.background),l=(r=this.canvasEl)==null?void 0:r.querySelectorAll(".plot-grid-row-header")[e],d=l?l.style.background:null;this.chooseColor(this.data.rows[e].bgColor||this.defaultBgColor(),c=>{if(c===null){n.forEach((p,f)=>p.style.background=i[f]),l&&d!==null&&(l.style.background=d);return}this.data.rows[e].bgColor=c||"";for(let p=0;p<this.data.columns.length;p++){let f=`${this.data.rows[e].id}-${this.data.columns[p].id}`,g=this.data.cells[f];g&&(g.bgColor=c||"")}this.scheduleSave(),this.renderGrid();for(let p=0;p<this.data.columns.length;p++)this.flashElement(this.getCellElement(e,p))},c=>{c===null?(n.forEach((p,f)=>p.style.background=i[f]),l&&d!==null&&(l.style.background=d)):(n.forEach(p=>p.style.background=c),l&&(l.style.background=c))})}else if(a!==null){let n=[];for(let c=0;c<this.data.rows.length;c++){let p=this.getCellElement(c,a);p&&n.push(p)}let i=n.map(c=>c.style.background),l=(s=this.canvasEl)==null?void 0:s.querySelectorAll(".plot-grid-col-header")[a],d=l?l.style.background:null;this.chooseColor(this.data.columns[a].bgColor||this.defaultBgColor(),c=>{if(c===null){n.forEach((p,f)=>p.style.background=i[f]),l&&d!==null&&(l.style.background=d);return}this.data.columns[a].bgColor=c||"";for(let p=0;p<this.data.rows.length;p++){let f=`${this.data.rows[p].id}-${this.data.columns[a].id}`,g=this.data.cells[f];g&&(g.bgColor=c||"")}this.scheduleSave(),this.renderGrid();for(let p=0;p<this.data.rows.length;p++)this.flashElement(this.getCellElement(p,a))},c=>{c===null?(n.forEach((p,f)=>p.style.background=i[f]),l&&d!==null&&(l.style.background=d)):(n.forEach(p=>p.style.background=c),l&&(l.style.background=c))})}else{new q.Notice("Select a cell, row, or column first");return}}setCellTextColorSelected(){var r,s;let e=this.selectedRow,a=this.selectedCol;if(e!==null&&a!==null){let n=this.getSelectedCellData();if(!n){new q.Notice("Select a cell first");return}let i=n.key,l=n.el,d=l.style.color;this.chooseColor(n.cell.textColor||this.defaultTextColor(),c=>{if(c===null){l.style.color=d;return}let p=this.data.cells[i];p&&(p.textColor=c||""),this.scheduleSave(),this.renderGrid();let f=this.getCellElement(e,a);f&&this.flashElement(f)},c=>{c===null?l.style.color=d:l.style.color=c})}else if(e!==null){let n=(r=this.canvasEl)==null?void 0:r.querySelectorAll(".plot-grid-row-header")[e],i=n?n.style.color:null;this.chooseColor(this.data.rows[e].textColor||this.defaultTextColor(),l=>{if(l===null){n&&i!==null&&(n.style.color=i);return}this.data.rows[e].textColor=l||"",this.scheduleSave(),this.renderGrid(),n&&this.flashElement(n)},l=>{l===null?n&&i!==null&&(n.style.color=i):n&&(n.style.color=l)})}else if(a!==null){let n=(s=this.canvasEl)==null?void 0:s.querySelectorAll(".plot-grid-col-header")[a],i=n?n.style.color:null;this.chooseColor(this.data.columns[a].textColor||this.defaultTextColor(),l=>{if(l===null){n&&i!==null&&(n.style.color=i);return}this.data.columns[a].textColor=l||"",this.scheduleSave(),this.renderGrid(),n&&this.flashElement(n)},l=>{l===null?n&&i!==null&&(n.style.color=i):n&&(n.style.color=l)})}else{new q.Notice("Select a cell, row, or column first");return}}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof q.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new q.Notice(`Could not find file: ${e.filePath}`)}async deleteScene(e){var r;let a=(r=this.plugin)==null?void 0:r.sceneManager;a&&(await a.deleteScene(e.filePath),this.renderGrid())}openQuickAddForCell(e){var s;let a=(s=this.plugin)==null?void 0:s.sceneManager;if(!a||!this.plugin)return;new ut(this.app,this.plugin,a,async(n,i)=>{let l=await a.createScene(n),d=this.data.cells[e];d&&(d.linkedSceneId=l.path),this.scheduleSave(),this.renderGrid(),i&&await this.app.workspace.getLeaf("tab").openFile(l)}).open()}enterEditMode(e,a,r){e.classList.add("editing"),e.empty();let s=e.createEl("textarea");s.value=a.content||"",s.style.width="100%",s.style.height="100%",s.style.border="none",s.style.padding="6px 8px",s.style.boxSizing="border-box",s.style.resize="none",s.style.background="transparent",s.style.color="inherit",s.style.font="inherit",s.style.outline="none",s.addEventListener("mousedown",l=>l.stopPropagation()),s.addEventListener("click",l=>l.stopPropagation()),s.addEventListener("dblclick",l=>l.stopPropagation()),this.wrapperEl&&(this.wrapperEl.tabIndex=-1);let n=!1,i=()=>{n||(n=!0,this.wrapperEl&&(this.wrapperEl.tabIndex=0),a.content=s.value,this.scheduleSave(),this.renderGrid())};requestAnimationFrame(()=>{s.focus()}),s.addEventListener("keydown",l=>{if(l.key==="Escape")this.renderGrid();else if(l.key==="Tab"){l.preventDefault(),i();let d=Number(e.getAttribute("data-row")),c=Number(e.getAttribute("data-col")),p=d,f=c+(l.shiftKey?-1:1);f>=this.data.columns.length&&(f=0,p=Math.min(this.data.rows.length-1,d+1)),f<0&&(f=Math.max(0,this.data.columns.length-1),p=Math.max(0,d-1)),setTimeout(()=>{let g=this.getCellElement(p,f),u=`${this.data.rows[p].id}-${this.data.columns[f].id}`,h=this.data.cells[u];g&&h&&(this.selectCell(g),this.enterEditMode(g,h,g.querySelector("div")))},20)}else l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),i())}),s.addEventListener("blur",()=>{i()})}openSceneLinkModal(e){let a=this.app;class r extends q.Modal{constructor(l,d){super(l);this.listEl=null;this.inputEl=null;this.onChoose=d}onOpen(){let{contentEl:l}=this;l.createEl("h3",{text:"Link Scene Card"}),this.inputEl=l.createEl("input"),this.inputEl.placeholder="Search files...",this.inputEl.style.width="100%",this.inputEl.addEventListener("input",()=>this.renderList()),this.listEl=l.createDiv("scene-link-list"),this.listEl.style.maxHeight="300px",this.listEl.style.overflow="auto",this.renderList()}renderList(){if(!this.listEl||!this.inputEl)return;this.listEl.empty();let l=this.inputEl.value.toLowerCase(),d=this.app.vault.getMarkdownFiles().filter(c=>c.path.toLowerCase().includes(l)||c.basename.toLowerCase().includes(l));for(let c of d){let p=this.listEl.createDiv("scene-link-row");p.style.padding="6px 8px",p.style.cursor="pointer",p.setText(c.path),p.addEventListener("click",()=>{this.onChoose(c.path),this.close()})}d.length===0&&this.listEl.createDiv({text:"No files found",cls:"muted"})}}new r(a,e).open()}ensureDefaults(){this.data.rows=this.data.rows||[],this.data.columns=this.data.columns||[],this.data.cells=this.data.cells||{},typeof this.data.stickyHeaders=="undefined"&&(this.data.stickyHeaders=!0)}addRow(){let e=E6("r-"),a=this.data.rows.length+1;this.data.rows.push({id:e,label:"Row "+a,height:80,bgColor:""}),this.scheduleSave(),this.renderGrid()}addColumn(){let e=E6("c-"),a=this.data.columns.length+1;this.data.columns.push({id:e,label:"Col "+a,width:160,bgColor:""}),this.scheduleSave(),this.renderGrid()}insertRowAt(e,a){let r=E6("r-"),s="Row "+(this.data.rows.length+1),n={id:r,label:s,height:80,bgColor:""},i=a?e:e+1;this.data.rows.splice(i,0,n),this.scheduleSave(),this.renderGrid()}deleteRow(e){let a=this.data.rows[e];if(a){for(let r of Object.keys(this.data.cells))r.startsWith(a.id+"-")&&delete this.data.cells[r];this.data.rows.splice(e,1),this.scheduleSave(),this.renderGrid()}}insertColumnAt(e,a){let r=E6("c-"),s="Col "+(this.data.columns.length+1),n={id:r,label:s,width:160,bgColor:""},i=a?e:e+1;this.data.columns.splice(i,0,n),this.scheduleSave(),this.renderGrid()}deleteColumn(e){let a=this.data.columns[e];if(a){for(let r of Object.keys(this.data.cells))r.endsWith("-"+a.id)&&delete this.data.cells[r];this.data.columns.splice(e,1),this.scheduleSave(),this.renderGrid()}}startColResize(e,a){e.preventDefault();let r=e.clientX,s=this.data.columns[a].width;document.body.style.cursor="col-resize";let n=l=>{let d=l.clientX-r,c=Math.max(60,Math.round(s+d));if(this.data.columns[a].width=c,this.canvasEl){let p=[i8+"px",...this.data.columns.map(g=>g.width+"px")].join(" ");this.canvasEl.style.gridTemplateColumns=p;let f=this.computeTotalWidth();this.canvasEl.style.width=f/this.data.zoom+"px"}},i=()=>{document.removeEventListener("mousemove",n),document.removeEventListener("mouseup",i),document.body.style.cursor="",this.scheduleSave(),this.renderGrid()};document.addEventListener("mousemove",n),document.addEventListener("mouseup",i)}startRowResize(e,a){e.preventDefault();let r=e.clientY,s=this.data.rows[a].height;document.body.style.cursor="row-resize";let n=l=>{let d=l.clientY-r,c=Math.max(40,Math.round(s+d));if(this.data.rows[a].height=c,this.canvasEl){let p=[x8+"px",...this.data.rows.map(f=>f.height+"px")].join(" ");this.canvasEl.style.gridTemplateRows=p}},i=()=>{document.removeEventListener("mousemove",n),document.removeEventListener("mouseup",i),document.body.style.cursor="",this.scheduleSave(),this.renderGrid()};document.addEventListener("mousemove",n),document.addEventListener("mouseup",i)}};var B=require("obsidian"),ht=lt(require("obsidian"));var P6=lt(require("obsidian")),Ft=class{constructor(o){this.plugin=o}render(o,e,a){var p,f,g;let r=e.createDiv({cls:"scene-card",attr:{"data-path":o.filePath,"data-status":o.status||"idea","data-act":o.act!==void 0?String(o.act):"",draggable:(a==null?void 0:a.draggable)!==!1?"true":"false"}}),s=(a==null?void 0:a.colorCoding)||this.plugin.settings.colorCoding,n=this.getCardColor(o,s);r.style.borderLeftColor=n;let i=r.createDiv("scene-card-header");o.sequence!==void 0&&i.createSpan({cls:"scene-card-seq",text:this.formatSequence(o)});let l=z[o.status||"idea"],d=i.createSpan({cls:"scene-card-status-icon",attr:{title:l.label}});P6.setIcon(d,l.icon),r.createDiv({cls:"scene-card-title",text:o.title||"Untitled"});let c=o.timeline_mode||"linear";if(!(a!=null&&a.compact)&&c!=="linear"){let u=r.createDiv({cls:`scene-card-timeline-mode timeline-mode-${c}`}),h=u.createSpan();P6.setIcon(h,Ct[c]||"clock"),u.createSpan({text:` ${At[c]}`}),o.timeline_strand&&u.createSpan({cls:"scene-card-strand",text:` \xB7 ${o.timeline_strand}`})}if(!(a!=null&&a.compact)&&o.pov&&r.createDiv("scene-card-meta").createSpan({cls:"scene-card-pov",text:`POV: ${o.pov}`}),!(a!=null&&a.compact)&&o.conflict&&r.createDiv({cls:"scene-card-conflict",text:o.conflict.length>80?o.conflict.substring(0,80)+"...":o.conflict}),!(a!=null&&a.compact)){let u=r.createDiv("scene-card-footer");if(this.plugin.settings.showWordCounts){let x=o.wordcount||0,m=o.target_wordcount,v=m?`${x} / ${m}`:String(x);u.createSpan({cls:"scene-card-wordcount",text:`${v} words`})}let h=u.createSpan("scene-card-progress");if(this.renderProgressDots(h,o.status||"idea"),(p=o.characters)!=null&&p.length){let x=r.createDiv("scene-card-characters");o.characters.slice(0,3).forEach(m=>{x.createSpan({cls:"scene-card-char-tag",text:m})}),o.characters.length>3&&x.createSpan({cls:"scene-card-char-more",text:`+${o.characters.length-3}`})}let y=(f=this.plugin.linkScanner)==null?void 0:f.getResult(o.filePath);if(y&&y.links.length>0){let x=new Set((o.characters||[]).map(M=>M.toLowerCase())),m=(g=o.location)==null?void 0:g.toLowerCase(),v=y.links.filter(M=>{let b=M.name.toLowerCase();return!(M.type==="character"&&x.has(b)||M.type==="location"&&b===m)}).length;if(v>0){let M=r.createDiv({cls:"scene-card-detected-badge"}),b=M.createSpan();P6.setIcon(b,"scan-search"),M.createSpan({text:String(v)}),M.setAttribute("title",`${v} link${v>1?"s":""} detected in text`)}}}return a!=null&&a.onSelect&&r.addEventListener("click",u=>{u.stopPropagation(),a.onSelect(o,u)}),a!=null&&a.onDoubleClick&&r.addEventListener("dblclick",u=>{u.stopPropagation(),a.onDoubleClick(o)}),a!=null&&a.onContextMenu&&r.addEventListener("contextmenu",u=>{u.preventDefault(),u.stopPropagation(),a.onContextMenu(o,u)}),(a==null?void 0:a.draggable)!==!1&&(r.addEventListener("dragstart",u=>{var h;(h=u.dataTransfer)==null||h.setData("text/scene-path",o.filePath),r.addClass("dragging")}),r.addEventListener("dragend",()=>{r.removeClass("dragging")})),r}renderProgressDots(o,e){let r=["idea","outlined","draft","written","revised","final"].indexOf(e);for(let s=0;s<3;s++){let n=s*2,i=r>=n;o.createSpan({cls:`scene-card-dot ${i?"filled":"empty"}`,text:i?"\u25CF":"\u25CB"})}}getCardColor(o,e){switch(e){case"status":return z[o.status||"idea"].color;case"pov":return this.stringToColor(o.pov||"none");case"emotion":return this.emotionToColor(o.emotion);case"act":return this.actToColor(o.act);case"tag":return this.tagToColor(o.tags);default:return z[o.status||"idea"].color}}tagToColor(o){if(!o||o.length===0)return"var(--sl-emotion-default, #9E9E9E)";let e=this.plugin.settings.tagColors||{};for(let a of o)if(e[a])return e[a];return this.stringToColor(o[0])}stringToColor(o){let e=0;for(let s=0;s<o.length;s++)e=o.charCodeAt(s)+((e<<5)-e);let a=Math.abs(e%360),r=getComputedStyle(document.body).getPropertyValue("--sl-pov-lightness").trim()||"55%";return`hsl(${a}, 65%, ${r})`}emotionToColor(o){return{tense:"var(--sl-emotion-tense, #E53935)",suspenseful:"var(--sl-emotion-suspenseful, #D32F2F)",joyful:"var(--sl-emotion-joyful, #43A047)",happy:"var(--sl-emotion-happy, #66BB6A)",melancholic:"var(--sl-emotion-melancholic, #5C6BC0)",sad:"var(--sl-emotion-sad, #7986CB)",romantic:"var(--sl-emotion-romantic, #EC407A)",mysterious:"var(--sl-emotion-mysterious, #8E24AA)",angry:"var(--sl-emotion-angry, #F44336)",hopeful:"var(--sl-emotion-hopeful, #29B6F6)",peaceful:"var(--sl-emotion-peaceful, #26A69A)"}[(o==null?void 0:o.toLowerCase())||""]||"var(--sl-emotion-default, #9E9E9E)"}actToColor(o){let e=["var(--sl-act-1, #2196F3)","var(--sl-act-2, #4CAF50)","var(--sl-act-3, #FF9800)","var(--sl-act-4, #9C27B0)","var(--sl-act-5, #F44336)"],a=typeof o=="number"?o-1:0;return e[a%e.length]||e[0]}formatSequence(o){let e=o.act!==void 0?String(o.act).padStart(2,"0"):"??",a=o.sequence!==void 0?String(o.sequence).padStart(2,"0"):"??";return`${e}-${a}`}};var pt=require("obsidian"),ta=lt(require("obsidian")),T6=class{constructor(o,e,a,r){this.currentFilter={};this.currentSort={field:"sequence",direction:"asc"};this.visible=!1;this.container=o,this.sceneManager=e,this.onChange=a,this.plugin=r!=null?r:null}render(){this.container.empty(),this.container.addClass("story-line-filters-container");let o=this.container.createDiv("story-line-filter-bar"),e=o.createDiv("story-line-search-wrapper"),a=e.createSpan();ta.setIcon(a,"search");let r=e.createEl("input",{cls:"story-line-search",attr:{type:"text",placeholder:"Search scenes..."}});r.addEventListener("input",()=>{this.currentFilter.searchText=r.value||void 0,this.emitChange()});let s=o.createDiv("story-line-sort"),n=s.createSpan();ta.setIcon(n,"arrow-down-up");let i=s.createEl("select",{cls:"dropdown"});[{value:"sequence",label:"Sequence"},{value:"title",label:"Title"},{value:"status",label:"Status"},{value:"act",label:"Act"},{value:"chapter",label:"Chapter"},{value:"wordcount",label:"Word Count"},{value:"modified",label:"Modified"}].forEach(u=>{let h=i.createEl("option",{text:u.label,value:u.value});u.value===this.currentSort.field&&(h.selected=!0)}),i.addEventListener("change",()=>{this.currentSort.field=i.value,this.emitChange()});let d=s.createEl("button",{cls:"story-line-sort-dir clickable-icon",attr:{title:"Toggle sort direction"}}),c=d.createSpan();ta.setIcon(c,"arrow-down-up"),d.addEventListener("click",()=>{this.currentSort.direction=this.currentSort.direction==="asc"?"desc":"asc",d.toggleClass("is-desc",this.currentSort.direction==="desc"),this.emitChange()});let p=o.createEl("button",{cls:"story-line-filter-toggle clickable-icon",attr:{title:"Show/hide filters"}}),f=p.createSpan();ta.setIcon(f,"list-filter"),p.addEventListener("click",()=>{this.visible=!this.visible,g.style.display=this.visible?"block":"none"});let g=this.container.createDiv("story-line-filter-panel");g.style.display=this.visible?"block":"none",this.renderFilterPanel(g)}renderFilterPanel(o){if(this.sceneManager.getUniqueValues("status").length>0){let d=new pt.Setting(o).setName("Status"),c=o.createDiv("story-line-filter-chips");["idea","outlined","draft","written","revised","final"].forEach(f=>{let g=c.createEl("button",{cls:"story-line-chip",text:f.charAt(0).toUpperCase()+f.slice(1)});g.addEventListener("click",()=>{this.currentFilter.status||(this.currentFilter.status=[]);let u=this.currentFilter.status.indexOf(f);u>=0?(this.currentFilter.status.splice(u,1),g.removeClass("active")):(this.currentFilter.status.push(f),g.addClass("active")),this.emitChange()})})}let a=this.sceneManager.getUniqueValues("act");if(a.length>0){new pt.Setting(o).setName("Act");let d=o.createDiv("story-line-filter-chips");a.forEach(c=>{let p=d.createEl("button",{cls:"story-line-chip",text:`Act ${c}`});p.addEventListener("click",()=>{this.currentFilter.act||(this.currentFilter.act=[]);let f=this.currentFilter.act.map(String).indexOf(c);f>=0?(this.currentFilter.act.splice(f,1),p.removeClass("active")):(this.currentFilter.act.push(c),p.addClass("active")),this.emitChange()})})}let r=this.sceneManager.getUniqueValues("pov");if(r.length>0){new pt.Setting(o).setName("POV");let d=o.createDiv("story-line-filter-chips");r.forEach(c=>{let p=d.createEl("button",{cls:"story-line-chip",text:c});p.addEventListener("click",()=>{this.currentFilter.pov||(this.currentFilter.pov=[]);let f=this.currentFilter.pov.indexOf(c);f>=0?(this.currentFilter.pov.splice(f,1),p.removeClass("active")):(this.currentFilter.pov.push(c),p.addClass("active")),this.emitChange()})})}let s=this.sceneManager.getAllCharacters();if(s.length>0){new pt.Setting(o).setName("Characters");let d=o.createDiv("story-line-filter-chips");s.forEach(c=>{var f;let p=d.createEl("button",{cls:"story-line-chip",text:c.replace(/\[\[|\]\]/g,"")});(f=this.currentFilter.characters)!=null&&f.includes(c)&&p.addClass("active"),p.addEventListener("click",()=>{this.currentFilter.characters||(this.currentFilter.characters=[]);let g=this.currentFilter.characters.indexOf(c);g>=0?(this.currentFilter.characters.splice(g,1),p.removeClass("active")):(this.currentFilter.characters.push(c),p.addClass("active")),this.emitChange()})})}let n=this.sceneManager.getUniqueValues("location");if(n.length>0){new pt.Setting(o).setName("Location");let d=o.createDiv("story-line-filter-chips");n.forEach(c=>{var f;let p=d.createEl("button",{cls:"story-line-chip",text:c.replace(/\[\[|\]\]/g,"")});(f=this.currentFilter.locations)!=null&&f.includes(c)&&p.addClass("active"),p.addEventListener("click",()=>{this.currentFilter.locations||(this.currentFilter.locations=[]);let g=this.currentFilter.locations.indexOf(c);g>=0?(this.currentFilter.locations.splice(g,1),p.removeClass("active")):(this.currentFilter.locations.push(c),p.addClass("active")),this.emitChange()})})}let i=this.sceneManager.getAllTags();if(i.length>0){new pt.Setting(o).setName("Tags");let d=o.createDiv("story-line-filter-chips");i.forEach(c=>{var f;let p=d.createEl("button",{cls:"story-line-chip",text:c});(f=this.currentFilter.tags)!=null&&f.includes(c)&&p.addClass("active"),p.addEventListener("click",()=>{this.currentFilter.tags||(this.currentFilter.tags=[]);let g=this.currentFilter.tags.indexOf(c);g>=0?(this.currentFilter.tags.splice(g,1),p.removeClass("active")):(this.currentFilter.tags.push(c),p.addClass("active")),this.emitChange()})})}if(this.plugin){let d=o.createDiv("story-line-preset-section"),c=d.createDiv("story-line-preset-header");c.createEl("span",{text:"Saved Presets",cls:"setting-item-name"}),c.createEl("button",{cls:"story-line-chip story-line-preset-save",text:"+ Save current"}).addEventListener("click",()=>{if(!Object.values(this.currentFilter).some(x=>x!==void 0&&(typeof x!="object"||Array.isArray(x)&&x.length>0))){new pt.Notice("No active filters to save");return}let h=document.createElement("input");h.type="text",h.placeholder="Preset name\u2026",h.className="story-line-preset-name-input",c.appendChild(h),h.focus();let y=()=>{let x=h.value.trim();if(!x){h.remove();return}let m={name:x,filter:JSON.parse(JSON.stringify(this.currentFilter))};this.sceneManager.addFilterPreset(m),h.remove(),this.render(),new pt.Notice(`Filter preset "${x}" saved`)};h.addEventListener("keydown",x=>{x.key==="Enter"&&y(),x.key==="Escape"&&h.remove()}),h.addEventListener("blur",y)});let f=d.createDiv("story-line-filter-chips");this.sceneManager.getFilterPresets().forEach((u,h)=>{let y=f.createEl("button",{cls:"story-line-chip story-line-preset-chip",text:u.name,attr:{title:"Click to apply, right\u2011click to delete"}});y.addEventListener("click",()=>{this.currentFilter=JSON.parse(JSON.stringify(u.filter)),this.render(),this.emitChange(),new pt.Notice(`Applied preset "${u.name}"`)}),y.addEventListener("contextmenu",x=>{x.preventDefault(),this.sceneManager.removeFilterPreset(h),this.render(),new pt.Notice(`Deleted preset "${u.name}"`)})})}o.createEl("button",{cls:"story-line-clear-filters",text:"Clear All Filters"}).addEventListener("click",()=>{this.currentFilter={},this.render(),this.emitChange()})}emitChange(){this.onChange(this.currentFilter,this.currentSort)}getFilter(){return this.currentFilter}getSort(){return this.currentSort}};var D6=class{constructor(o){this.innerEl=null;this.topSpacer=null;this.bottomSpacer=null;this.contentEl=null;this.scrollHandler=null;this.lastStart=-1;this.lastEnd=-1;var e,a;this.container=o.container,this.itemHeight=o.itemHeight,this.items=o.items,this.renderItem=o.renderItem,this.overscan=(e=o.overscan)!=null?e:5,this.threshold=(a=o.threshold)!=null?a:40}mount(){if(this.items.length<this.threshold){for(let o=0;o<this.items.length;o++)this.renderItem(this.items[o],o,this.container);return}this.innerEl=this.container.createDiv({cls:"virtual-scroll-inner"}),this.topSpacer=this.innerEl.createDiv({cls:"virtual-scroll-spacer"}),this.contentEl=this.innerEl.createDiv({cls:"virtual-scroll-content"}),this.bottomSpacer=this.innerEl.createDiv({cls:"virtual-scroll-spacer"}),this.scrollHandler=()=>this.onScroll(),this.container.addEventListener("scroll",this.scrollHandler,{passive:!0}),this.onScroll()}setItems(o){this.items=o,this.lastStart=-1,this.lastEnd=-1,this.innerEl&&this.onScroll()}destroy(){this.scrollHandler&&(this.container.removeEventListener("scroll",this.scrollHandler),this.scrollHandler=null)}onScroll(){if(!this.contentEl||!this.topSpacer||!this.bottomSpacer)return;let o=this.container.scrollTop,e=this.container.clientHeight,a=this.items.length*this.itemHeight,r=Math.floor(o/this.itemHeight)-this.overscan,s=Math.ceil((o+e)/this.itemHeight)+this.overscan;if(r=Math.max(0,r),s=Math.min(this.items.length,s),!(r===this.lastStart&&s===this.lastEnd)){this.lastStart=r,this.lastEnd=s,this.topSpacer.style.height=`${r*this.itemHeight}px`,this.bottomSpacer.style.height=`${(this.items.length-s)*this.itemHeight}px`,this.contentEl.empty();for(let n=r;n<s;n++)this.renderItem(this.items[n],n,this.contentEl)}}};var H6=class extends B.ItemView{constructor(e,a,r){super(e);this.filtersComponent=null;this.inspectorComponent=null;this.currentFilter={};this.currentSort={field:"sequence",direction:"asc"};this.groupBy="act";this.selectedScene=null;this.selectedScenes=new Set;this.boardEl=null;this.bulkBarEl=null;this.rootContainer=null;this.scrollers=[];this.plugin=a,this.sceneManager=r,this.cardComponent=new Ft(a)}getViewType(){return nt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"layout-grid"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-board-container"),this.rootContainer=e,await this.sceneManager.initialize(),this.renderView(e)}async onClose(){}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");this.renderToolbar(a);let r=e.createDiv("story-line-main-area"),s=r.createDiv("story-line-filters-container");this.filtersComponent=new T6(s,this.sceneManager,(i,l)=>{this.currentFilter=i,this.currentSort=l,this.refreshBoard()},this.plugin),this.filtersComponent.render(),this.boardEl=r.createDiv("story-line-board"),Ht(this.boardEl),this.bulkBarEl=r.createDiv("story-line-bulk-bar"),this.bulkBarEl.style.display="none",this.renderBoard();let n=r.createDiv("story-line-inspector-panel");n.style.display="none",this.inspectorComponent=new wt(n,this.plugin,this.sceneManager,{onEdit:i=>this.openScene(i),onDelete:i=>this.deleteScene(i),onStatusChange:async(i,l)=>{await this.sceneManager.updateScene(i.filePath,{status:l}),this.refreshBoard()}})}renderToolbar(e){e.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(e,nt,this.plugin,this.leaf);let r=e.createDiv("story-line-toolbar-controls"),s=r.createDiv("story-line-group-control");s.createSpan({text:"Group by: "});let n=s.createEl("select",{cls:"dropdown"});[{value:"act",label:"Act"},{value:"chapter",label:"Chapter"},{value:"status",label:"Status"},{value:"pov",label:"POV"}].forEach(f=>{let g=n.createEl("option",{text:f.label,value:f.value});f.value===this.groupBy&&(g.selected=!0)}),n.addEventListener("change",()=>{this.groupBy=n.value,this.refreshBoard()}),r.createEl("button",{cls:"mod-cta story-line-add-btn",text:"+ New Scene"}).addEventListener("click",()=>this.openQuickAdd());let d=r.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Add acts or chapters"}});typeof ht.setIcon=="function"?ht.setIcon(d,"columns-3"):console.error("obsidian.setIcon is not defined when setting structBtn"),d.addEventListener("click",()=>this.openStructureModal());let c=r.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Resequence all scenes from 1"}});typeof ht.setIcon=="function"?ht.setIcon(c,"list-ordered"):console.error("obsidian.setIcon is not defined when setting reseqBtn"),c.addEventListener("click",async()=>{let f=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"});for(let g=0;g<f.length;g++)await this.sceneManager.updateScene(f[g].filePath,{sequence:g+1});await this.sceneManager.initialize(),this.refreshBoard()});let p=r.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Refresh"}});typeof ht.setIcon=="function"?ht.setIcon(p,"refresh-cw"):console.error("obsidian.setIcon is not defined when setting refreshBtn"),p.addEventListener("click",async()=>{await this.sceneManager.initialize(),this.refreshBoard()})}renderBoard(){if(!this.boardEl)return;this.boardEl.empty();for(let r of this.scrollers)r.destroy();this.scrollers=[];let e=this.sceneManager.getScenesGroupedByWithEmpty(this.groupBy,this.currentFilter,this.currentSort),a=this.sortGroupKeys(Array.from(e.keys()));if(a.length===0){let r=this.boardEl.createDiv("story-line-empty");r.createEl("p",{text:"No scenes found."}),r.createEl("p",{text:'Click "+ New Scene" to create your first scene, or check your Scene folder setting.'});return}for(let r of a){let s=e.get(r)||[];this.renderColumn(this.boardEl,r,s)}}renderColumn(e,a,r){let s=e.createDiv("story-line-column"),n=s.createDiv("story-line-column-header"),i=this.getColumnDisplayTitle(a);n.createSpan({cls:"story-line-column-title",text:`${i} (${r.length})`}),(this.groupBy==="act"||this.groupBy==="chapter")&&n.addEventListener("contextmenu",f=>{f.preventDefault(),this.showColumnContextMenu(f,a,r)});let l=s.createDiv("story-line-column-body"),d=(f,g,u)=>{let h=this.cardComponent.render(f,u,{compact:this.plugin.settings.compactCardView,onSelect:(y,x)=>{this.selectScene(y,x)},onDoubleClick:y=>this.openScene(y),onContextMenu:(y,x)=>this.showContextMenu(y,x),draggable:!0});return h.addEventListener("dragover",y=>{y.preventDefault(),y.stopPropagation();let x=h.getBoundingClientRect(),m=x.top+x.height/2;h.removeClass("drop-above","drop-below"),y.clientY<m?h.addClass("drop-above"):h.addClass("drop-below")}),h.addEventListener("dragleave",()=>{h.removeClass("drop-above","drop-below")}),h.addEventListener("drop",async y=>{var b;y.preventDefault(),y.stopPropagation(),h.removeClass("drop-above","drop-below"),l.removeClass("drag-over");let x=(b=y.dataTransfer)==null?void 0:b.getData("text/scene-path");if(!x||x===f.filePath)return;let m=h.getBoundingClientRect(),v=m.top+m.height/2,M=y.clientY<v;await this.handleDropOnCard(x,f,a,r,M)}),h},c=new D6({container:l,itemHeight:this.plugin.settings.compactCardView?60:110,items:r,renderItem:d,overscan:5,threshold:40});c.mount(),this.scrollers.push(c),l.addEventListener("dragover",f=>{f.preventDefault(),l.addClass("drag-over")}),l.addEventListener("dragleave",f=>{l.contains(f.relatedTarget)||l.removeClass("drag-over")}),l.addEventListener("drop",async f=>{var u;f.preventDefault(),l.removeClass("drag-over");let g=(u=f.dataTransfer)==null?void 0:u.getData("text/scene-path");g&&await this.handleDrop(g,a,r)}),s.createEl("button",{cls:"story-line-column-add",text:"+ Add Scene"}).addEventListener("click",()=>this.openQuickAdd(a))}async handleDropOnCard(e,a,r,s,n){var p;let i={};switch(this.groupBy){case"act":{let f=r.match(/Act (\d+)/);f&&(i.act=Number(f[1]));break}case"chapter":{let f=r.match(/Chapter (\d+)/);f&&(i.chapter=Number(f[1]));break}case"status":i.status=r;break;case"pov":i.pov=r!=="No POV"?r:void 0;break}let l=(p=a.sequence)!=null?p:0;n?i.sequence=l:i.sequence=l+1,await this.sceneManager.updateScene(e,i);let d=s.filter(f=>f.filePath!==e).sort((f,g)=>{var u,h;return((u=f.sequence)!=null?u:0)-((h=g.sequence)!=null?h:0)}),c=1;for(let f of d)c===i.sequence&&c++,await this.sceneManager.updateScene(f.filePath,{sequence:c}),c++;this.refreshBoard()}async handleDrop(e,a,r){let s={};switch(this.groupBy){case"act":{let i=a.match(/Act (\d+)/);i&&(s.act=Number(i[1]));break}case"chapter":{let i=a.match(/Chapter (\d+)/);i&&(s.chapter=Number(i[1]));break}case"status":{s.status=a;break}case"pov":{s.pov=a!=="No POV"?a:void 0;break}}let n=r.reduce((i,l)=>{var d;return Math.max(i,(d=l.sequence)!=null?d:0)},0);s.sequence=n+1,await this.sceneManager.updateScene(e,s),this.refreshBoard()}selectScene(e,a){var s,n,i,l,d;if(a&&(a.ctrlKey||a.metaKey)){if(this.selectedScenes.has(e.filePath)){this.selectedScenes.delete(e.filePath);let c=(s=this.boardEl)==null?void 0:s.querySelector(`[data-path="${CSS.escape(e.filePath)}"]`);c&&c.removeClass("selected")}else{this.selectedScenes.add(e.filePath);let c=(n=this.boardEl)==null?void 0:n.querySelector(`[data-path="${CSS.escape(e.filePath)}"]`);c&&c.addClass("selected")}this.selectedScene=e}else{this.selectedScenes.clear(),(i=this.boardEl)==null||i.querySelectorAll(".scene-card.selected").forEach(p=>{p.removeClass("selected")}),this.selectedScene=e,this.selectedScenes.add(e.filePath);let c=(l=this.boardEl)==null?void 0:l.querySelector(`[data-path="${CSS.escape(e.filePath)}"]`);c&&c.addClass("selected")}(d=this.inspectorComponent)==null||d.show(e),this.updateBulkBar()}updateBulkBar(){if(!this.bulkBarEl)return;if(this.selectedScenes.size<2){this.bulkBarEl.style.display="none";return}this.bulkBarEl.empty(),this.bulkBarEl.style.display="flex";let e=this.selectedScenes.size;this.bulkBarEl.createSpan({cls:"bulk-bar-label",text:`${e} scenes selected`});let a=this.bulkBarEl.createEl("button",{cls:"bulk-bar-btn",text:"Set Status"}),r=a.createSpan();ht.setIcon(r,"check-circle"),a.addEventListener("click",f=>{let g=new B.Menu;["idea","outlined","draft","written","revised","final"].forEach(h=>{g.addItem(y=>{y.setTitle(h.charAt(0).toUpperCase()+h.slice(1)).onClick(async()=>{for(let x of this.selectedScenes)await this.sceneManager.updateScene(x,{status:h});new B.Notice(`Updated status to "${h}" for ${e} scenes`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()})})}),g.showAtMouseEvent(f)});let s=this.bulkBarEl.createEl("button",{cls:"bulk-bar-btn",text:"Move to Act"}),n=s.createSpan();ht.setIcon(n,"folder"),s.addEventListener("click",f=>{let g=new B.Menu,u=this.sceneManager.getDefinedActs();u.length===0?this.sceneManager.getUniqueValues("act").forEach(y=>{g.addItem(x=>{x.setTitle(`Act ${y}`).onClick(async()=>{for(let m of this.selectedScenes)await this.sceneManager.updateScene(m,{act:Number(y)||y});new B.Notice(`Moved ${e} scenes to Act ${y}`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()})})}):u.forEach(h=>{g.addItem(y=>{y.setTitle(`Act ${h}`).onClick(async()=>{for(let x of this.selectedScenes)await this.sceneManager.updateScene(x,{act:h});new B.Notice(`Moved ${e} scenes to Act ${h}`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()})})}),g.showAtMouseEvent(f)});let i=this.bulkBarEl.createEl("button",{cls:"bulk-bar-btn",text:"Add Tag"}),l=i.createSpan();ht.setIcon(l,"tag"),i.addEventListener("click",f=>{let g=new B.Menu;this.sceneManager.getAllTags().forEach(h=>{g.addItem(y=>{y.setTitle(h).onClick(async()=>{for(let x of this.selectedScenes){let m=this.sceneManager.getScene(x);if(m){let v=[...m.tags||[]];v.includes(h)||(v.push(h),await this.sceneManager.updateScene(x,{tags:v}))}}new B.Notice(`Added tag "${h}" to ${e} scenes`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()})})}),g.addSeparator(),g.addItem(h=>{h.setTitle("New tag\u2026").setIcon("plus").onClick(()=>{let y=prompt("Enter new tag:");y&&(async()=>{for(let x of this.selectedScenes){let m=this.sceneManager.getScene(x);if(m){let v=[...m.tags||[]];v.includes(y)||(v.push(y),await this.sceneManager.updateScene(x,{tags:v}))}}new B.Notice(`Added tag "${y}" to ${e} scenes`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()})()})}),g.showAtMouseEvent(f)});let d=this.bulkBarEl.createEl("button",{cls:"bulk-bar-btn bulk-bar-delete",text:"Delete"}),c=d.createSpan();ht.setIcon(c,"trash"),d.addEventListener("click",async()=>{ct(this.app,{title:"Delete Scenes",message:`Delete ${e} scene(s)? This cannot be undone.`,confirmLabel:"Delete",onConfirm:async()=>{for(let f of this.selectedScenes)await this.sceneManager.deleteScene(f);new B.Notice(`Deleted ${e} scenes`),this.selectedScenes.clear(),this.refreshBoard(),this.updateBulkBar()}})}),this.bulkBarEl.createEl("button",{cls:"bulk-bar-btn bulk-bar-clear",text:"\xD7 Clear"}).addEventListener("click",()=>{var f;this.selectedScenes.clear(),(f=this.boardEl)==null||f.querySelectorAll(".scene-card.selected").forEach(g=>{g.removeClass("selected")}),this.updateBulkBar()})}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof B.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new B.Notice(`Could not find file: ${e.filePath}`)}async deleteScene(e){await this.sceneManager.deleteScene(e.filePath),this.refreshBoard()}showContextMenu(e,a){let r=new B.Menu;r.addItem(n=>{n.setTitle("Edit Scene").setIcon("pencil").onClick(()=>this.openScene(e))}),r.addItem(n=>{n.setTitle("Duplicate Scene").setIcon("copy").onClick(async()=>{await this.sceneManager.duplicateScene(e.filePath),this.refreshBoard()})}),r.addSeparator(),["idea","outlined","draft","written","revised","final"].forEach(n=>{r.addItem(i=>{i.setTitle(`Status: ${n}`).setChecked(e.status===n).onClick(async()=>{await this.sceneManager.updateScene(e.filePath,{status:n}),this.refreshBoard()})})}),r.addSeparator(),r.addItem(n=>{n.setTitle("Delete Scene").setIcon("trash").onClick(async()=>{ct(this.app,{title:"Delete Scene",message:`Delete scene "${e.title||"Untitled"}"?`,confirmLabel:"Delete",onConfirm:()=>this.deleteScene(e)})})}),r.showAtMouseEvent(a)}getColumnDisplayTitle(e){let a=e.match(/^Act\s+(\d+)$/);if(a){let s=parseInt(a[1],10),n=this.sceneManager.getActLabel(s);return n?`Act ${s} \u2014 ${n}`:e}let r=e.match(/^Chapter\s+(\d+)$/);if(r){let s=parseInt(r[1],10),n=this.sceneManager.getChapterLabel(s);return n?`Ch ${s} \u2014 ${n}`:e}return e}showColumnContextMenu(e,a,r){let s=new B.Menu,n=a.match(/^Act\s+(\d+)$/),i=a.match(/^Chapter\s+(\d+)$/);if(n){let l=parseInt(n[1],10),d=this.sceneManager.getActLabel(l)||"";s.addItem(c=>{c.setTitle("Rename Act").setIcon("pencil").onClick(()=>{this.openRenameModal("Act",l,d,async p=>{await this.sceneManager.setActLabel(l,p),this.refreshBoard()})})}),s.addItem(c=>{c.setTitle("Delete Act").setIcon("trash").onClick(()=>{r.length>0?ct(this.app,{title:"Delete Act",message:`Act ${l} contains ${r.length} scene(s). Deleting the act removes the column but keeps the scenes (they'll become unassigned). Continue?`,onConfirm:async()=>{for(let p of r)await this.sceneManager.updateScene(p.filePath,{act:void 0});await this.sceneManager.removeAct(l),await this.sceneManager.setActLabel(l,""),this.refreshBoard(),new B.Notice(`Deleted Act ${l}`)}}):this.sceneManager.removeAct(l).then(()=>{this.sceneManager.setActLabel(l,"").then(()=>{this.refreshBoard(),new B.Notice(`Deleted Act ${l}`)})})})})}else if(i){let l=parseInt(i[1],10),d=this.sceneManager.getChapterLabel(l)||"";s.addItem(c=>{c.setTitle("Rename Chapter").setIcon("pencil").onClick(()=>{this.openRenameModal("Chapter",l,d,async p=>{await this.sceneManager.setChapterLabel(l,p),this.refreshBoard()})})}),s.addItem(c=>{c.setTitle("Delete Chapter").setIcon("trash").onClick(()=>{r.length>0?ct(this.app,{title:"Delete Chapter",message:`Chapter ${l} contains ${r.length} scene(s). Deleting the chapter removes the column but keeps the scenes (they'll become unassigned). Continue?`,onConfirm:async()=>{for(let p of r)await this.sceneManager.updateScene(p.filePath,{chapter:void 0});await this.sceneManager.removeChapter(l),await this.sceneManager.setChapterLabel(l,""),this.refreshBoard(),new B.Notice(`Deleted Chapter ${l}`)}}):this.sceneManager.removeChapter(l).then(()=>{this.sceneManager.setChapterLabel(l,"").then(()=>{this.refreshBoard(),new B.Notice(`Deleted Chapter ${l}`)})})})})}s.showAtMouseEvent(e)}openRenameModal(e,a,r,s){let n=new B.Modal(this.app);n.titleEl.setText(`Rename ${e} ${a}`);let{contentEl:i}=n,l=r;new B.Setting(i).setName("Label").setDesc(`Display name for ${e} ${a}. Leave blank to remove.`).addText(f=>{f.setValue(r).setPlaceholder('e.g. "The Beginning"').onChange(g=>{l=g}),setTimeout(()=>f.inputEl.focus(),50)});let d=i.createDiv("structure-close-row");d.createEl("button",{text:"Save",cls:"mod-cta"}).addEventListener("click",async()=>{await s(l),n.close()}),d.createEl("button",{text:"Cancel"}).addEventListener("click",()=>n.close()),n.open()}openStructureModal(){let e=new B.Modal(this.app);e.titleEl.setText("Manage Story Structure");let{contentEl:a}=e;a.createEl("h3",{text:"Beat Sheet Templates"}),a.createEl("p",{cls:"setting-item-description",text:"Apply a template to pre-populate your act/chapter structure with named beats."});let r=a.createDiv("beat-sheet-grid");for(let x of ia){let m=r.createDiv("beat-sheet-card");m.createDiv({cls:"beat-sheet-card-name",text:x.name}),m.createDiv({cls:"beat-sheet-card-summary",text:x.summary});let v=m.createDiv("beat-sheet-card-info");v.createSpan({text:`${x.acts.length} acts \xB7 ${x.beats.length} beats`}),x.chapters.length>0&&v.createSpan({text:` \xB7 ${x.chapters.length} chapters`}),m.createEl("button",{text:"Apply",cls:"mod-cta beat-sheet-apply-btn"}).addEventListener("click",async()=>{await this.sceneManager.applyBeatSheet(x),d(),g(),new B.Notice(`Applied "${x.name}" template`)})}a.createEl("h3",{text:"Acts"});let s=a.createEl("p",{cls:"setting-item-description",text:"Define acts for your story. Empty acts will appear as columns even without scenes."}),n=a.createDiv("structure-list"),i=this.sceneManager.getDefinedActs(),l=new Map;for(let x of this.sceneManager.getAllScenes())if(x.act!==void 0){let m=Number(x.act);l.set(m,(l.get(m)||0)+1)}let d=()=>{n.empty();let x=this.sceneManager.getDefinedActs(),m=this.sceneManager.getActLabels();x.length===0&&n.createEl("p",{cls:"structure-empty",text:"No acts defined yet."});for(let v of x){let M=l.get(v)||0,b=m[v],A=n.createDiv("structure-row"),S=b?`Act ${v} \u2014 ${b}`:`Act ${v}`;A.createSpan({cls:"structure-label",text:S}),A.createSpan({cls:"structure-count",text:`${M} scene${M!==1?"s":""}`});let L=A.createEl("button",{cls:"clickable-icon structure-remove",attr:{"aria-label":`Remove Act ${v}`}});L.textContent="\xD7",L.addEventListener("click",async()=>{await this.sceneManager.removeAct(v),d()})}};d();let c=a.createDiv("structure-add-row");new B.Setting(c).setName("Add acts").setDesc('Enter act numbers (e.g. "1,2,3,4,5" or "6" to add one)').addText(x=>{x.setPlaceholder("1,2,3,4,5"),x.inputEl.addClass("structure-input"),x.inputEl._ref=x}).addButton(x=>{x.setButtonText("Add").setCta().onClick(async()=>{let m=c.querySelector(".structure-input");if(!(m!=null&&m.value))return;let v=m.value.split(",").map(M=>parseInt(M.trim())).filter(M=>!isNaN(M)&&M>0);if(v.length===0){new B.Notice("Enter valid act numbers (e.g. 1,2,3)");return}await this.sceneManager.addActs(v),m.value="",d(),new B.Notice(`Added ${v.length} act(s)`)})}),a.createEl("h3",{text:"Chapters"}),a.createEl("p",{cls:"setting-item-description",text:"Define chapters. Empty chapters appear as columns when grouping by chapter."});let p=a.createDiv("structure-list"),f=new Map;for(let x of this.sceneManager.getAllScenes())if(x.chapter!==void 0){let m=Number(x.chapter);f.set(m,(f.get(m)||0)+1)}let g=()=>{p.empty();let x=this.sceneManager.getDefinedChapters(),m=this.sceneManager.getChapterLabels();x.length===0&&p.createEl("p",{cls:"structure-empty",text:"No chapters defined yet."});for(let v of x){let M=f.get(v)||0,b=m[v],A=p.createDiv("structure-row"),S=b?`Chapter ${v} \u2014 ${b}`:`Chapter ${v}`;A.createSpan({cls:"structure-label",text:S}),A.createSpan({cls:"structure-count",text:`${M} scene${M!==1?"s":""}`});let L=A.createEl("button",{cls:"clickable-icon structure-remove",attr:{"aria-label":`Remove Chapter ${v}`}});L.textContent="\xD7",L.addEventListener("click",async()=>{await this.sceneManager.removeChapter(v),g()})}};g();let u=a.createDiv("structure-add-row");new B.Setting(u).setName("Add chapters").setDesc('Enter chapter numbers (e.g. "1-10" or "1,2,3")').addText(x=>{x.setPlaceholder("1-10"),x.inputEl.addClass("structure-input")}).addButton(x=>{x.setButtonText("Add").setCta().onClick(async()=>{let m=u.querySelector(".structure-input");if(!(m!=null&&m.value))return;let v=[],M=m.value.trim(),b=M.match(/^(\d+)\s*-\s*(\d+)$/);if(b){let A=parseInt(b[1]),S=parseInt(b[2]);for(let L=A;L<=S;L++)v.push(L)}else v=M.split(",").map(A=>parseInt(A.trim())).filter(A=>!isNaN(A)&&A>0);if(v.length===0){new B.Notice("Enter valid chapter numbers (e.g. 1-10 or 1,2,3)");return}await this.sceneManager.addChapters(v),m.value="",g(),new B.Notice(`Added ${v.length} chapter(s)`)})}),a.createDiv("structure-close-row").createEl("button",{text:"Done",cls:"mod-cta"}).addEventListener("click",()=>{e.close(),this.refreshBoard()}),e.open()}openQuickAdd(e){new ut(this.app,this.plugin,this.sceneManager,async(r,s)=>{if(e&&this.groupBy==="act"){let i=e.match(/Act (\d+)/);i&&(r.act=Number(i[1]))}let n=await this.sceneManager.createScene(r);this.refreshBoard(),s&&await this.app.workspace.getLeaf("tab").openFile(n)}).open()}refreshBoard(){var e;if(this.renderBoard(),this.selectedScene){let a=this.sceneManager.getScene(this.selectedScene.filePath);a&&(this.selectedScene=a,(e=this.inspectorComponent)==null||e.show(a))}}refresh(){this.rootContainer&&this.renderView(this.rootContainer)}sortGroupKeys(e){return e.sort((a,r)=>{let s=parseInt(a.replace(/\D/g,"")),n=parseInt(r.replace(/\D/g,""));return!isNaN(s)&&!isNaN(n)?s-n:a.startsWith("No ")?1:r.startsWith("No ")?-1:a.localeCompare(r)})}};var U=require("obsidian"),rt=lt(require("obsidian"));var F6=class extends U.ItemView{constructor(e,a,r){super(e);this.inspectorComponent=null;this.selectedScene=null;this.zoomLevel=1;this.rootContainer=null;this.swimlaneMode=!1;this.swimlaneGroupBy="pov";this.timelineOrder="reading";this.plugin=a,this.sceneManager=r,this.cardComponent=new Ft(a)}getViewType(){return xt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"clock"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-timeline-container"),this.rootContainer=e,await this.sceneManager.initialize(),this.renderView(e)}async onClose(){}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");a.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(a,xt,this.plugin,this.leaf);let s=a.createDiv("story-line-toolbar-controls");s.createEl("button",{cls:"mod-cta story-line-add-btn",text:"+ New Scene"}).addEventListener("click",()=>this.openQuickAdd());let i=s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Add acts or chapters"}});rt.setIcon(i,"columns-3"),i.addEventListener("click",()=>this.openStructureModal());let l=s.createEl("button",{cls:`clickable-icon${this.swimlaneMode?" is-active":""}`,attr:{"aria-label":this.swimlaneMode?"Switch to linear":"Switch to swimlanes",title:this.swimlaneMode?"Linear mode":"Swimlane mode"}});rt.setIcon(l,"columns-2"),l.addEventListener("click",()=>{this.swimlaneMode=!this.swimlaneMode,this.refresh()});let d=s.createEl("select",{cls:"dropdown story-line-order-select",attr:{"aria-label":"Scene ordering"}});d.addEventListener("keydown",y=>y.stopPropagation());let c=[{value:"reading",label:"Reading Order"},{value:"chronological",label:"Chronological Order"}];for(let y of c){let x=d.createEl("option",{text:y.label});x.value=y.value,y.value===this.timelineOrder&&(x.selected=!0)}if(d.addEventListener("change",()=>{this.timelineOrder=d.value,this.refresh()}),this.swimlaneMode){let y=s.createEl("select",{cls:"dropdown story-line-swimlane-group-select",attr:{"aria-label":"Group lanes by"}});y.addEventListener("keydown",m=>m.stopPropagation());let x=[{value:"pov",label:"By POV"},{value:"location",label:"By Location"},{value:"tag",label:"By Tag"}];for(let m of x){let v=y.createEl("option",{text:m.label});v.value=m.value,m.value===this.swimlaneGroupBy&&(v.selected=!0)}y.addEventListener("change",()=>{this.swimlaneGroupBy=y.value,this.refresh()})}s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Zoom out"},text:"\u2212"}).addEventListener("click",()=>{this.zoomLevel=Math.max(.5,this.zoomLevel-.25),this.refreshTimeline(e)}),s.createSpan({cls:"story-line-zoom-level",text:`${Math.round(this.zoomLevel*100)}%`}),s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Zoom in"},text:"+"}).addEventListener("click",()=>{this.zoomLevel=Math.min(3,this.zoomLevel+.25),this.refreshTimeline(e)});let g=s.createEl("button",{cls:"clickable-icon",attr:{"aria-label":"Refresh"}});rt.setIcon(g,"refresh-cw"),g.addEventListener("click",async()=>{await this.sceneManager.initialize(),this.refresh()});let u=e.createDiv("story-line-main-area");this.swimlaneMode?this.renderSwimlaneTimeline(u):this.renderTimeline(u);let h=u.createDiv("story-line-inspector-panel");h.style.display="none",this.inspectorComponent=new wt(h,this.plugin,this.sceneManager,{onEdit:y=>this.openScene(y),onDelete:y=>this.deleteScene(y),onStatusChange:async(y,x)=>{await this.sceneManager.updateScene(y.filePath,{status:x}),this.refresh()}})}renderTimeline(e){let a=e.querySelector(".story-line-timeline");a&&a.remove();let r=e.createDiv("story-line-timeline"),s=this.timelineOrder==="chronological"?"chronologicalOrder":"sequence",n=this.sceneManager.getFilteredScenes(void 0,{field:s,direction:"asc"}),i=new Set(["flashback","flash_forward","dream","mythic","circular","simultaneous"]),l=n.map(C=>this.parseSceneDateTimestamp(C)),d=n.map(C=>this.parseSceneTimeTimestamp(C)),c=n.map((C,w)=>{var V,R;if(i.has(C.timeline_mode))return!1;let k=w>0?l[w-1]:null,T=l[w],H=w<n.length-1?l[w+1]:null;return k!==null&&T!==null&&k>T&&!i.has((V=n[w-1])==null?void 0:V.timeline_mode)||H!==null&&T!==null&&T>H&&!i.has((R=n[w+1])==null?void 0:R.timeline_mode)}),p=n.map((C,w)=>{var F,I;if(i.has(C.timeline_mode))return!1;let k=w>0?l[w-1]:null,T=w<n.length-1?l[w+1]:null,H=w>0?d[w-1]:null,V=d[w],R=w<n.length-1?d[w+1]:null,P=!1;return H!==null&&V!==null&&(i.has((F=n[w-1])==null?void 0:F.timeline_mode)||(k===null&&l[w]===null||k!==null&&l[w]!==null&&k===l[w])&&H>V&&(P=!0)),R!==null&&V!==null&&(i.has((I=n[w+1])==null?void 0:I.timeline_mode)||(T===null&&l[w]===null||T!==null&&l[w]!==null&&T===l[w])&&V>R&&(P=!0)),P}),f=this.sceneManager.getDefinedActs(),g=new Set;for(let C of n)C.act!==void 0&&g.add(Number(C.act));if(n.length===0&&f.length===0){let C=r.createDiv("story-line-empty");C.createEl("p",{text:"No scenes found."}),C.createEl("p",{text:'Click "+ New Scene" to create your first scene, or use the structure button to set up acts and chapters.'});return}let u=r.createDiv("timeline-track"),h,y=null,x=null,m=()=>{u.querySelectorAll(".timeline-entry").forEach((w,k)=>{w.classList.toggle("drop-above",x===k),w.classList.toggle("drop-below",x===k+1)})},v=async(C,w)=>{if(C===w||C===w-1)return;let k=n.splice(C,1)[0],T=w>C?w-1:w;n.splice(T,0,k);let H=this.timelineOrder==="chronological"?"chronologicalOrder":"sequence";for(let V=0;V<n.length;V++)await this.sceneManager.updateScene(n[V].filePath,{[H]:V+1});this.refresh()},M=new Map,b=[];for(let C of n)if(C.act!==void 0){let w=Number(C.act);M.has(w)||M.set(w,[]),M.get(w).push(C)}else b.push(C);let A=new Set([...f,...g]),S=Array.from(A).sort((C,w)=>C-w),L;for(let C=0;C<n.length;C++){let w=n[C],k=w.act!==void 0?Number(w.act):void 0;if(k!==L){let T=k!==void 0?this.sceneManager.getActLabel(k):void 0,H=k!==void 0?T?`Act ${k} \u2014 ${T}`:`Act ${k}`:"No Act",V=u.createDiv("timeline-act-divider");if(V.createSpan({cls:"timeline-act-label",text:H}),k!==void 0){let R=V.createEl("button",{cls:"timeline-act-add-btn clickable-icon",attr:{"aria-label":`Add scene to ${H}`}});rt.setIcon(R,"plus"),R.addEventListener("click",P=>{P.stopPropagation(),this.openQuickAdd(k)})}L=k}this.renderTimelineEntry(u,w,C,n,y,x,m,v,T=>{y=T},T=>{x=T},c[C],p[C])}for(let C of S)if(!g.has(Number(C))){let w=this.sceneManager.getActLabel(C),k=w?`Act ${C} \u2014 ${w}`:`Act ${C}`,T=u.createDiv("timeline-act-divider");T.createSpan({cls:"timeline-act-label",text:k});let H=T.createEl("button",{cls:"timeline-act-add-btn clickable-icon",attr:{"aria-label":`Add scene to ${k}`}});rt.setIcon(H,"plus"),H.addEventListener("click",F=>{F.stopPropagation(),this.openQuickAdd(C)});let P=u.createDiv("timeline-entry timeline-entry-empty").createDiv("timeline-entry-card").createDiv("timeline-card timeline-card-empty");P.createDiv({cls:"timeline-card-title",text:`No scenes in ${k}`}),P.createEl("p",{cls:"timeline-card-hint",text:"Click + to add a scene"}),P.addEventListener("click",()=>this.openQuickAdd(C))}}renderSwimlaneTimeline(e){let a=e.querySelector(".story-line-timeline");a&&a.remove();let r=e.createDiv("story-line-timeline swimlane-timeline");Ht(r);let s=this.timelineOrder==="chronological"?"chronologicalOrder":"sequence",n=this.sceneManager.getFilteredScenes(void 0,{field:s,direction:"asc"});if(n.length===0){let u=r.createDiv("story-line-empty");u.createEl("p",{text:"No scenes found."}),u.createEl("p",{text:'Click "+ New Scene" to create your first scene.'});return}let i=new Set;for(let u of n){let h=this.getSceneLaneKeys(u);for(let y of h)i.add(y)}let l=Array.from(i).sort();l.length===0&&l.push("(none)");let d=[],c;for(let u=0;u<n.length;u++){let h=n[u],y=h.act!==void 0?Number(h.act):void 0;if(y!==c){let x=y!==void 0?this.sceneManager.getActLabel(y):void 0,m=y!==void 0?x?`Act ${y} \u2014 ${x}`:`Act ${y}`:"No Act";d.push({type:"act-divider",actLabel:m,actNum:y}),c=y}d.push({type:"scene",scene:h,globalIdx:u})}let p=r.createDiv("swimlane-grid"),f=`80px repeat(${l.length}, minmax(180px, 1fr))`;p.style.gridTemplateColumns=f;let g=p.createDiv("swimlane-corner");g.textContent="#";for(let u of l){let h=p.createDiv("swimlane-lane-header");h.textContent=u,h.setAttribute("title",u)}for(let u of d){if(u.type==="act-divider"){let A=p.createDiv("swimlane-act-divider");A.style.gridColumn="1 / -1";let S=A.createSpan({cls:"timeline-act-label",text:u.actLabel||""});if(u.actNum!==void 0){let L=A.createEl("button",{cls:"timeline-act-add-btn clickable-icon",attr:{"aria-label":`Add scene to ${u.actLabel}`}});rt.setIcon(L,"plus");let C=u.actNum;L.addEventListener("click",w=>{w.stopPropagation(),this.openQuickAdd(C)})}continue}let h=u.scene,y=h.act!==void 0?String(h.act).padStart(2,"0"):"??",x=h.sequence!==void 0?String(h.sequence).padStart(2,"0"):"??",m=h.chronologicalOrder!==void 0?String(h.chronologicalOrder).padStart(2,"0"):null,v=p.createDiv("swimlane-seq-cell");v.classList.add("timeline-seq-clickable"),v.createSpan({cls:"timeline-seq-badge",text:`${y}-${x}`}),m!==null&&h.chronologicalOrder!==h.sequence&&v.createSpan({cls:"timeline-chrono-badge",text:`C${m}`}).setAttribute("title",`Chronological order: ${m}`),h.storyDate&&v.createSpan({cls:"timeline-date-badge",text:h.storyDate}),h.storyTime&&v.createSpan({cls:"timeline-time-badge",text:h.storyTime}),v.setAttribute("title","Click to edit date/time"),v.addEventListener("click",A=>{A.stopPropagation(),this.openTimeEditModal(h)});let b=this.getSceneLaneKeys(h)[0]||"(none)";for(let A=0;A<l.length;A++){let S=l[A],L=p.createDiv("swimlane-lane-cell");S===b&&this.renderSwimlaneCard(L,h)}}}getSceneLaneKeys(e){switch(this.swimlaneGroupBy){case"pov":return[e.pov||"(no POV)"];case"location":return[e.location||"(no location)"];case"tag":return e.tags&&e.tags.length>0?[e.tags[0]]:["(no tag)"];default:return["(none)"]}}renderSwimlaneCard(e,a){var f,g;e.createDiv("swimlane-dot-wrap").createDiv("timeline-dot").setAttribute("data-status",a.status||"idea");let n=e.createDiv("timeline-card swimlane-card");((f=this.selectedScene)==null?void 0:f.filePath)===a.filePath&&n.addClass("selected"),n.dataset.path=a.filePath,n.createDiv({cls:"timeline-card-title",text:a.title||"Untitled"});let i=a.timeline_mode||"linear";if(i!=="linear"){let u=n.createDiv({cls:`timeline-mode-badge timeline-mode-${i}`}),h=u.createSpan();rt.setIcon(h,Ct[i]||"clock"),u.createSpan({text:` ${At[i]}`}),a.timeline_strand&&u.createSpan({cls:"timeline-strand-label",text:` \xB7 ${a.timeline_strand}`})}let l=n.createDiv("timeline-card-meta");if(this.swimlaneGroupBy!=="pov"&&a.pov&&l.createSpan({cls:"timeline-card-pov",text:`POV: ${a.pov}`}),this.swimlaneGroupBy!=="location"&&a.location){let u=l.createSpan({cls:"timeline-card-location"});rt.setIcon(u,"map-pin"),u.appendText(" "+a.location)}this.swimlaneGroupBy!=="tag"&&((g=a.tags)!=null&&g.length)&&l.createSpan({cls:"timeline-card-pov",text:a.tags.join(", ")});let d=n.createDiv("timeline-card-footer"),c=z[a.status||"idea"],p=d.createSpan({cls:"timeline-card-status",text:c.label});p.style.color=c.color,a.wordcount&&d.createSpan({cls:"timeline-card-wc",text:`${a.wordcount} words`}),n.addEventListener("click",u=>{u.stopPropagation(),this.selectScene(a)}),n.addEventListener("dblclick",u=>{u.stopPropagation(),this.openScene(a)}),n.addEventListener("contextmenu",u=>{u.preventDefault(),u.stopPropagation(),this.showContextMenu(a,u)}),n.style.transform=`scale(${this.zoomLevel})`,n.style.transformOrigin="left top"}renderTimelineEntry(e,a,r,s,n,i,l,d,c,p,f,g){var V,R;let u=e.createDiv("timeline-entry");u.setAttr("draggable","true"),u.dataset.idx=String(r),u.dataset.path=a.filePath,((V=this.selectedScene)==null?void 0:V.filePath)===a.filePath&&u.addClass("selected"),u.addEventListener("dragstart",P=>{var F,I;c(r),u.classList.add("dragging"),(F=P.dataTransfer)==null||F.setData("text/plain",String(r)),(I=P.dataTransfer)==null||I.setDragImage(u,20,20)}),u.addEventListener("dragend",()=>{c(null),p(null),u.classList.remove("dragging"),l()}),u.addEventListener("dragover",P=>{P.preventDefault();let F=u.getBoundingClientRect(),I=F.top+F.height/2;p(P.clientY<I?r:r+1),l()}),u.addEventListener("dragleave",()=>{p(null),l()}),u.addEventListener("drop",async P=>{var I;P.preventDefault();let F=(I=P.dataTransfer)==null?void 0:I.getData("text/plain");if(F!=null){let et=Number(F);await d(et,r)}});let h=u.createDiv("timeline-entry-seq");h.classList.add("timeline-seq-clickable");let y=a.act!==void 0?String(a.act).padStart(2,"0"):"??",x=a.sequence!==void 0?String(a.sequence).padStart(2,"0"):"??",m=a.chronologicalOrder!==void 0?String(a.chronologicalOrder).padStart(2,"0"):null;h.createSpan({cls:"timeline-seq-badge",text:`${y}-${x}`}),m!==null&&a.chronologicalOrder!==a.sequence&&h.createSpan({cls:"timeline-chrono-badge",text:`C${m}`}).setAttribute("title",`Chronological order: ${m}`);let v=a.storyDate?h.createSpan({cls:"timeline-date-badge",text:a.storyDate}):null,M=a.storyTime?h.createSpan({cls:"timeline-time-badge",text:a.storyTime}):null;if(!a.storyDate&&!a.storyTime){let P=h.createSpan({cls:"timeline-add-time-hint"});rt.setIcon(P,"clock")}h.setAttribute("title","Click to edit date/time"),h.addEventListener("click",P=>{P.stopPropagation(),this.openTimeEditModal(a)}),u.createDiv("timeline-entry-dot-col").createDiv("timeline-dot").setAttribute("data-status",a.status||"idea");let L=u.createDiv("timeline-entry-card").createDiv("timeline-card");L.createDiv({cls:"timeline-card-title",text:a.title||"Untitled"});let C=a.timeline_mode||"linear";if(C!=="linear"){let P=L.createDiv({cls:`timeline-mode-badge timeline-mode-${C}`}),F=P.createSpan();rt.setIcon(F,Ct[C]||"clock"),P.createSpan({text:` ${At[C]}`}),a.timeline_strand&&P.createSpan({cls:"timeline-strand-label",text:` \xB7 ${a.timeline_strand}`})}let w=L.createDiv("timeline-card-meta");if(a.pov&&w.createSpan({cls:"timeline-card-pov",text:`POV: ${a.pov}`}),a.location){let P=w.createSpan({cls:"timeline-card-location"});rt.setIcon(P,"map-pin"),P.appendText(" "+a.location)}if(a.timeline){let P=w.createSpan({cls:"timeline-card-time"});rt.setIcon(P,"calendar-days"),P.appendText(" "+a.timeline)}if(a.storyDate||a.storyTime){let P=w.createSpan({cls:"timeline-card-time"});rt.setIcon(P,"calendar-days"),P.appendText(" "+`${a.storyDate||""} ${a.storyTime||""}`.trim())}f&&v&&(v.addClass("timeline-date-invalid"),v.setAttr("title","Date out of order")),g&&M&&(M.addClass("timeline-time-invalid"),M.setAttr("title","Time out of order")),a.conflict&&L.createDiv({cls:"timeline-card-conflict",text:a.conflict.length>100?a.conflict.substring(0,100)+"...":a.conflict});let k=L.createDiv("timeline-card-footer"),T=z[a.status||"idea"],H=k.createSpan({cls:"timeline-card-status",text:T.label});if(H.style.color=T.color,a.wordcount&&k.createSpan({cls:"timeline-card-wc",text:`${a.wordcount} words`}),(R=a.characters)!=null&&R.length){let P=L.createDiv("timeline-card-chars");a.characters.forEach(F=>{P.createSpan({cls:"timeline-char-tag",text:F})})}L.addEventListener("click",P=>{P.stopPropagation(),this.selectScene(a)}),L.addEventListener("dblclick",P=>{P.stopPropagation(),this.openScene(a)}),L.addEventListener("contextmenu",P=>{P.preventDefault(),P.stopPropagation(),this.showContextMenu(a,P)}),L.style.transform=`scale(${this.zoomLevel})`,L.style.transformOrigin="left center"}parseSceneTimestamp(e){var a,r;try{let s=(a=e.storyDate)==null?void 0:a.trim(),n=(r=e.storyTime)==null?void 0:r.trim();if(s||n){let d=[s||"",n||""].join(" ").trim(),c=Date.parse(d);if(!isNaN(c))return c;let p=(s||"").match(/dag\s*(\d+)/i)||(e.timeline||"").match(/dag\s*(\d+)/i);if(p){let f=parseInt(p[1],10);if(!isNaN(f))return f*24*60*60*1e3}if(!s&&n){let f=Date.parse("1970-01-01 "+n);if(!isNaN(f))return f}}let i=e.timeline||"",l=i.match(/dag\s*(\d+)/i)||i.match(/day\s*(\d+)/i);if(l){let d=parseInt(l[1],10);if(!isNaN(d))return d*24*60*60*1e3}}catch(s){}return null}parseSceneDateTimestamp(e){var a;try{let r=(a=e.storyDate)==null?void 0:a.trim();if(r){let s=Date.parse(r);if(!isNaN(s))return new Date(new Date(s).toDateString()).getTime();let n=r.match(/dag\s*(\d+)/i)||(e.timeline||"").match(/dag\s*(\d+)/i);if(n){let i=parseInt(n[1],10);if(!isNaN(i))return i*24*60*60*1e3}}}catch(r){}return null}parseSceneTimeTimestamp(e){var a;try{let r=(a=e.storyTime)==null?void 0:a.trim();if(r){r=r.replace(/\./g,":");let s=r.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(s){let i=parseInt(s[1],10),l=parseInt(s[2],10),d=s[3]?parseInt(s[3],10):0;if(!isNaN(i)&&!isNaN(l))return(i*3600+l*60+d)*1e3}let n=Date.parse("1970-01-01 "+r);if(!isNaN(n))return n}}catch(r){}return null}compareSceneOrder(e,a){let r=this.parseSceneTimestamp(e),s=this.parseSceneTimestamp(a);return r!==null&&s!==null?r<s?-1:r>s?1:0:0}formatSceneTime(e){let a=e.storyDate?e.storyDate:"",r=e.storyTime?" "+e.storyTime:"";return a||r?(a+r).trim():e.timeline?e.timeline:"\u2014"}selectScene(e){var r,s,n;(r=this.rootContainer)==null||r.querySelectorAll(".timeline-entry.selected").forEach(i=>{i.removeClass("selected")}),this.selectedScene=e;let a=(s=this.rootContainer)==null?void 0:s.querySelector(`[data-path="${CSS.escape(e.filePath)}"]`);a&&a.addClass("selected"),(n=this.inspectorComponent)==null||n.show(e)}showContextMenu(e,a){let r=new U.Menu;r.addItem(n=>{n.setTitle("Edit Scene").setIcon("pencil").onClick(()=>this.openScene(e))}),r.addItem(n=>{n.setTitle("Edit Date/Time").setIcon("clock").onClick(()=>this.openTimeEditModal(e))}),r.addItem(n=>{n.setTitle("Duplicate Scene").setIcon("copy").onClick(async()=>{await this.sceneManager.duplicateScene(e.filePath),this.refresh()})}),r.addSeparator(),["idea","outlined","draft","written","revised","final"].forEach(n=>{r.addItem(i=>{i.setTitle(`Status: ${n}`).setChecked(e.status===n).onClick(async()=>{await this.sceneManager.updateScene(e.filePath,{status:n}),this.refresh()})})}),r.addSeparator(),r.addItem(n=>{n.setTitle("Delete Scene").setIcon("trash").onClick(async()=>{ct(this.app,{title:"Delete Scene",message:`Delete scene "${e.title||"Untitled"}"?`,confirmLabel:"Delete",onConfirm:()=>this.deleteScene(e)})})}),r.showAtMouseEvent(a)}async deleteScene(e){var a,r;await this.sceneManager.deleteScene(e.filePath),((a=this.selectedScene)==null?void 0:a.filePath)===e.filePath&&(this.selectedScene=null,(r=this.inspectorComponent)==null||r.hide()),this.refresh()}openQuickAdd(e){new ut(this.app,this.plugin,this.sceneManager,async(r,s)=>{e!==void 0&&(r.act=e);let n=await this.sceneManager.createScene(r);this.refresh(),s&&await this.app.workspace.getLeaf("tab").openFile(n)}).open()}openStructureModal(){let e=new U.Modal(this.app);e.titleEl.setText("Manage Story Structure");let{contentEl:a}=e;a.createEl("h3",{text:"Beat Sheet Templates"}),a.createEl("p",{cls:"setting-item-description",text:"Apply a template to pre-populate your act/chapter structure with named beats."});let r=a.createDiv("beat-sheet-grid");for(let h of ia){let y=r.createDiv("beat-sheet-card");y.createDiv({cls:"beat-sheet-card-name",text:h.name}),y.createDiv({cls:"beat-sheet-card-summary",text:h.summary});let x=y.createDiv("beat-sheet-card-info");x.createSpan({text:`${h.acts.length} acts`}),x.createSpan({text:" \xB7 "}),x.createSpan({text:`${h.beats.length} beats`}),h.chapters.length>0&&(x.createSpan({text:" \xB7 "}),x.createSpan({text:`${h.chapters.length} chapters`}));let m=y.createDiv("beat-sheet-beats-preview");for(let M of h.beats){let b=m.createDiv("beat-sheet-beat-item");b.createSpan({cls:"beat-sheet-beat-act",text:`A${M.act}`}),b.createSpan({cls:"beat-sheet-beat-label",text:M.label}),b.createSpan({cls:"beat-sheet-beat-desc",text:M.description})}y.createEl("button",{text:"Apply",cls:"mod-cta beat-sheet-apply-btn"}).addEventListener("click",async()=>{await this.sceneManager.applyBeatSheet(h),i(),p(),new U.Notice(`Applied "${h.name}" template`)})}a.createEl("h3",{text:"Acts"}),a.createEl("p",{cls:"setting-item-description",text:"Define acts for your story. Empty acts appear on the timeline even without scenes."});let s=a.createDiv("structure-list"),n=new Map;for(let h of this.sceneManager.getAllScenes())if(h.act!==void 0){let y=Number(h.act);n.set(y,(n.get(y)||0)+1)}let i=()=>{s.empty();let h=this.sceneManager.getDefinedActs(),y=this.sceneManager.getActLabels();h.length===0&&s.createEl("p",{cls:"structure-empty",text:"No acts defined yet."});for(let x of h){let m=n.get(x)||0,v=y[x],M=s.createDiv("structure-row"),b=v?`Act ${x} \u2014 ${v}`:`Act ${x}`;M.createSpan({cls:"structure-label",text:b}),M.createSpan({cls:"structure-count",text:`${m} scene${m!==1?"s":""}`});let A=M.createEl("button",{cls:"clickable-icon structure-edit",attr:{"aria-label":`Edit label for Act ${x}`}});A.textContent="\u270E",A.addEventListener("click",()=>{let L=M.querySelector(".structure-label-input");if(L){L.focus();return}let C=M.querySelector(".structure-label");if(!C)return;C.style.display="none";let w=document.createElement("input");w.type="text",w.value=v||"",w.placeholder="e.g. Setup, Confrontation\u2026",w.className="structure-label-input",M.insertBefore(w,C.nextSibling),w.focus();let k=async()=>{await this.sceneManager.setActLabel(x,w.value),i()};w.addEventListener("blur",k),w.addEventListener("keydown",T=>{T.key==="Enter"&&(T.preventDefault(),w.blur()),T.key==="Escape"&&(C.style.display="",w.remove())})});let S=M.createEl("button",{cls:"clickable-icon structure-remove",attr:{"aria-label":`Remove Act ${x}`}});S.textContent="\xD7",S.addEventListener("click",async()=>{await this.sceneManager.removeAct(x),i()})}};i();let l=a.createDiv("structure-add-row");new U.Setting(l).setName("Add acts").setDesc('Enter act numbers (e.g. "1,2,3,4,5")').addText(h=>{h.setPlaceholder("1,2,3,4,5"),h.inputEl.addClass("structure-input")}).addButton(h=>{h.setButtonText("Add").setCta().onClick(async()=>{let y=l.querySelector(".structure-input");if(!(y!=null&&y.value))return;let x=y.value.split(",").map(m=>parseInt(m.trim())).filter(m=>!isNaN(m)&&m>0);if(x.length===0){new U.Notice("Enter valid act numbers (e.g. 1,2,3)");return}await this.sceneManager.addActs(x),y.value="",i(),new U.Notice(`Added ${x.length} act(s)`)})}),a.createEl("h3",{text:"Chapters"}),a.createEl("p",{cls:"setting-item-description",text:"Define chapters. Empty chapters appear when grouping by chapter."});let d=a.createDiv("structure-list"),c=new Map;for(let h of this.sceneManager.getAllScenes())if(h.chapter!==void 0){let y=Number(h.chapter);c.set(y,(c.get(y)||0)+1)}let p=()=>{d.empty();let h=this.sceneManager.getDefinedChapters();h.length===0&&d.createEl("p",{cls:"structure-empty",text:"No chapters defined yet."});for(let y of h){let x=c.get(y)||0,m=d.createDiv("structure-row");m.createSpan({cls:"structure-label",text:`Chapter ${y}`}),m.createSpan({cls:"structure-count",text:`${x} scene${x!==1?"s":""}`});let v=m.createEl("button",{cls:"clickable-icon structure-remove",attr:{"aria-label":`Remove Chapter ${y}`}});v.textContent="\xD7",v.addEventListener("click",async()=>{await this.sceneManager.removeChapter(y),p()})}};p();let f=a.createDiv("structure-add-row");new U.Setting(f).setName("Add chapters").setDesc('Enter chapter numbers (e.g. "1-10" or "1,2,3")').addText(h=>{h.setPlaceholder("1-10"),h.inputEl.addClass("structure-input")}).addButton(h=>{h.setButtonText("Add").setCta().onClick(async()=>{let y=f.querySelector(".structure-input");if(!(y!=null&&y.value))return;let x=[],m=y.value.trim(),v=m.match(/^(\d+)\s*-\s*(\d+)$/);if(v){let M=parseInt(v[1]),b=parseInt(v[2]);for(let A=M;A<=b;A++)x.push(A)}else x=m.split(",").map(M=>parseInt(M.trim())).filter(M=>!isNaN(M)&&M>0);if(x.length===0){new U.Notice("Enter valid chapter numbers (e.g. 1-10 or 1,2,3)");return}await this.sceneManager.addChapters(x),y.value="",p(),new U.Notice(`Added ${x.length} chapter(s)`)})}),a.createDiv("structure-close-row").createEl("button",{text:"Done",cls:"mod-cta"}).addEventListener("click",()=>{e.close(),this.refresh()}),e.open()}openTimeEditModal(e){let a=new U.Modal(this.app);a.titleEl.setText(`Time & Order \u2014 ${e.title||"Untitled"}`);let r=e.storyDate||"",s=e.storyTime||"",n=e.timeline||"",i=e.chronologicalOrder!==void 0?String(e.chronologicalOrder):"",l=e.timeline_mode||"linear",d=e.timeline_strand||"";new U.Setting(a.contentEl).setName("Date / Day").setDesc("E.g. 2026-02-17, Day 1, Monday, Chapter 3\u2026").addText(f=>{f.setValue(r).setPlaceholder("e.g. Day 1").onChange(g=>r=g)}),new U.Setting(a.contentEl).setName("Time").setDesc("E.g. 14:00, morning, evening, night\u2026").addText(f=>{f.setValue(s).setPlaceholder("e.g. evening").onChange(g=>s=g)}),new U.Setting(a.contentEl).setName("Timeline note").setDesc("Free-form note about when this happens in the story").addText(f=>{f.setValue(n).setPlaceholder("e.g. After the party").onChange(g=>n=g)}),new U.Setting(a.contentEl).setName("Chronological order").setDesc("The order this event happens in story time (for non-linear narratives)").addText(f=>{f.setValue(i).setPlaceholder("e.g. 5").onChange(g=>i=g),f.inputEl.type="number",f.inputEl.min="1"});let c=a.contentEl.createDiv("time-edit-mode-section");new U.Setting(c).setName("Timeline mode").setDesc("How the plugin handles this scene's temporal position").addDropdown(f=>{for(let g of sa)f.addOption(g,At[g]);f.setValue(l),f.onChange(g=>{l=g,p.settingEl.style.display=g==="parallel"||g==="frame"?"":"none"})});let p=new U.Setting(c).setName("Timeline strand").setDesc(`Name for this timeline strand (e.g. "1943", "Outer frame", "Sarah's past")`).addText(f=>{f.setValue(d).setPlaceholder("e.g. 1943").onChange(g=>d=g)});p.settingEl.style.display=l==="parallel"||l==="frame"?"":"none",new U.Setting(a.contentEl).addButton(f=>{f.setButtonText("Save").setCta().onClick(async()=>{let g={};g.storyDate=r.trim()||void 0,g.storyTime=s.trim()||void 0,g.timeline=n.trim()||void 0;let u=parseInt(i.trim(),10);g.chronologicalOrder=!isNaN(u)&&u>0?u:void 0,g.timeline_mode=l!=="linear"?l:void 0,g.timeline_strand=d.trim()||void 0,await this.sceneManager.updateScene(e.filePath,g),this.refresh(),a.close()})}),a.open()}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof U.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new U.Notice(`Could not find file: ${e.filePath}`)}refreshTimeline(e){this.renderView(e)}refresh(){this.rootContainer&&this.renderView(this.rootContainer)}};var W=require("obsidian"),ea=lt(require("obsidian"));var V6=class extends W.ItemView{constructor(e,a,r){super(e);this.rootContainer=null;this.sortMode="alpha";this.plugin=a,this.sceneManager=r}getViewType(){return gt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"git-branch"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-storyline-container"),this.rootContainer=e,await this.sceneManager.initialize(),this.renderView(e)}async onClose(){}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");a.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(a,gt,this.plugin,this.leaf);let s=a.createDiv("story-line-toolbar-controls"),n=s.createEl("button",{cls:"story-line-toolbar-btn",attr:{"aria-label":"Sort plotlines",title:"Sort plotlines"}}),i=n.createSpan();ea.setIcon(i,"arrow-down-up"),n.addEventListener("click",u=>{let h=new W.Menu;h.addItem(y=>{y.setTitle(`${this.sortMode==="alpha"?"\u2713 ":""}Alphabetical`).onClick(()=>{this.sortMode="alpha",this.refresh()})}),h.addItem(y=>{y.setTitle(`${this.sortMode==="scenes-desc"?"\u2713 ":""}Most scenes first`).onClick(()=>{this.sortMode="scenes-desc",this.refresh()})}),h.addItem(y=>{y.setTitle(`${this.sortMode==="scenes-asc"?"\u2713 ":""}Fewest scenes first`).onClick(()=>{this.sortMode="scenes-asc",this.refresh()})}),h.addItem(y=>{y.setTitle(`${this.sortMode==="book-order"?"\u2713 ":""}Book order (scene #)`).onClick(()=>{this.sortMode="book-order",this.refresh()})}),h.showAtPosition({x:u.clientX,y:u.clientY})}),s.createEl("button",{cls:"mod-cta story-line-add-btn",text:"+ New Plotline"}).addEventListener("click",()=>this.openNewPlotlineModal());let d=e.createDiv("story-line-storyline-content"),c=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"}),p=this.groupByPlotline(c);if(p.size===0&&c.length===0){d.createDiv({cls:"story-line-empty",text:"No scenes found. Create scenes first, then create plotlines to organize them."});return}let f=Array.from(p.keys());this.sortMode==="alpha"?f.sort():this.sortMode==="scenes-desc"?f.sort((u,h)=>{var y,x;return(((y=p.get(h))==null?void 0:y.length)||0)-(((x=p.get(u))==null?void 0:x.length)||0)}):this.sortMode==="scenes-asc"?f.sort((u,h)=>{var y,x;return(((y=p.get(u))==null?void 0:y.length)||0)-(((x=p.get(h))==null?void 0:x.length)||0)}):this.sortMode==="book-order"&&f.sort((u,h)=>{let y=p.get(u)||[],x=p.get(h)||[],m=y.length>0?Math.min(...y.map(M=>{var b;return(b=M.sequence)!=null?b:1/0})):1/0,v=x.length>0?Math.min(...x.map(M=>{var b;return(b=M.sequence)!=null?b:1/0})):1/0;return m-v}),f.length>0&&d.createDiv("storyline-help").createSpan({cls:"storyline-help-text",text:'A plotline groups scenes that share a story thread \u2014 e.g. "main mystery" or "love story". Hover a plotline header for \u270F\uFE0F rename, \u2795 add scenes, or \u{1F5D1}\uFE0F delete. Click any scene to assign/remove it from plotlines.'});for(let u of f){let h=p.get(u)||[];this.renderPlotline(d,u,h,c)}let g=c.filter(u=>!u.tags||u.tags.length===0);if(g.length>0){let u=d.createDiv("storyline-orphaned"),h=u.createDiv("storyline-header storyline-unassigned-header");h.createSpan({cls:"storyline-unassigned-label",text:`Unassigned (${g.length} scenes)`}),h.createSpan({cls:"storyline-unassigned-hint",text:"\u2014 click a scene to assign it to a plotline"});let y=u.createDiv("storyline-nodes");g.forEach(x=>{this.renderSceneNode(y,x,f)})}if(f.length===0&&c.length>0){let u=d.createDiv("storyline-getting-started");u.createEl("h4",{text:"What are plotlines?"}),u.createEl("p",{text:'A plotline is a story thread that runs through your scenes. For example: "main mystery", "love story", "character arc \u2014 Flora".'}),u.createEl("h4",{text:"How to get started"});let h=u.createEl("ol");h.createEl("li",{text:'Click "+ New Plotline" above'}),h.createEl("li",{text:'Give it a name (e.g. "main mystery")'}),h.createEl("li",{text:"Select which scenes belong to it"}),u.createEl("p",{cls:"storyline-help-text",text:"You can assign a scene to multiple plotlines. This helps you see how each thread weaves through your story."})}}renderPlotline(e,a,r,s){let n=e.createDiv("storyline-section"),l=(this.plugin.settings.tagColors||{})[a]||"",d=n.createDiv("storyline-header");l&&(d.style.borderLeftColor=l);let c=d.createSpan({cls:"storyline-toggle",text:"\u25BC "}),p=d.createSpan({cls:"storyline-plotline-title",text:`${this.formatPlotlineName(a)} (${r.length})`}),f=d.createDiv("storyline-header-actions"),g=f.createEl("button",{cls:"clickable-icon storyline-action-btn",attr:{"aria-label":"Rename plotline",title:"Rename"}}),u=g.createSpan();ea.setIcon(u,"pencil"),g.addEventListener("click",k=>{k.stopPropagation(),this.openRenamePlotlineModal(a)});let h=f.createEl("button",{cls:"clickable-icon storyline-action-btn",attr:{"aria-label":"Add scenes to this plotline",title:"Add scenes"}}),y=h.createSpan();ea.setIcon(y,"plus"),h.addEventListener("click",k=>{k.stopPropagation(),this.openAddSceneToPlotlineModal(a,r,s)});let x=f.createEl("button",{cls:"clickable-icon storyline-action-btn storyline-delete-btn",attr:{"aria-label":"Delete plotline",title:"Delete"}}),m=x.createSpan();ea.setIcon(m,"trash-2"),x.addEventListener("click",k=>{k.stopPropagation(),this.confirmDeletePlotline(a,r.length)}),d.addEventListener("contextmenu",k=>{k.preventDefault(),k.stopPropagation();let T=new W.Menu;T.addItem(H=>{H.setTitle("Rename plotline").setIcon("pencil").onClick(()=>this.openRenamePlotlineModal(a))}),T.addItem(H=>{H.setTitle("Add scenes").setIcon("plus").onClick(()=>this.openAddSceneToPlotlineModal(a,r,s))}),T.addSeparator(),T.addItem(H=>{H.setTitle("Delete plotline").setIcon("trash-2").onClick(()=>this.confirmDeletePlotline(a,r.length))}),T.showAtPosition({x:k.clientX,y:k.clientY})});let v=n.createDiv("storyline-body"),M=new Map;for(let k of r){let T=k.act!==void 0?`Act ${k.act}`:"No Act";M.has(T)||M.set(T,[]),M.get(T).push(k)}if(M.size>1||M.size===1&&!M.has("No Act"))for(let[k,T]of M){let H=v.createDiv("plotline-act-group");H.createSpan({cls:"plotline-act-label",text:k});let V=H.createDiv("storyline-flow");T.forEach((R,P)=>{this.renderSceneNode(V,R,[a]),P<T.length-1&&V.createSpan({cls:"storyline-arrow",text:"\u2192"})})}else{let k=v.createDiv("storyline-flow");r.forEach((T,H)=>{this.renderSceneNode(k,T,[a]),H<r.length-1&&k.createSpan({cls:"storyline-arrow",text:"\u2192"})})}let b=s.length,A=b>0?Math.round(r.length/b*100):0,S=v.createDiv("plotline-summary");S.createSpan({cls:"plotline-summary-text",text:`${r.length} of ${b} scenes (${A}%)`});let C=S.createDiv("plotline-progress-bar").createDiv("plotline-progress-fill");C.style.width=`${A}%`,l&&(C.style.backgroundColor=l);let w=!1;d.addEventListener("click",()=>{w=!w,v.style.display=w?"none":"block",c.textContent=w?"\u25B6 ":"\u25BC "})}renderSceneNode(e,a,r){var l,d;let s=e.createDiv("storyline-node"),n=a.act!==void 0?String(a.act).padStart(2,"0"):"??",i=a.sequence!==void 0?String(a.sequence).padStart(2,"0"):"??";if(s.createSpan({cls:"storyline-node-id",text:`[${n}-${i}]`}),s.createSpan({cls:"storyline-node-title",text:` ${a.title||"Untitled"}`}),(l=a.tags)!=null&&l.length){let c=s.createDiv("storyline-node-tags"),p=this.plugin.settings.tagColors||{};a.tags.forEach(f=>{let g=c.createSpan({cls:"storyline-tag-badge",text:f});p[f]&&(g.style.backgroundColor=p[f])})}s.setAttribute("data-status",a.status||"idea"),s.addEventListener("click",c=>{c.stopPropagation(),this.showTagAssignMenu(a,s)}),s.setAttribute("title",`${a.title||"Untitled"}
Tags: ${((d=a.tags)==null?void 0:d.join(", "))||"none"}
Click to assign/remove plotline`)}showTagAssignMenu(e,a){let r=new W.Menu,s=this.sceneManager.getAllTags(),n=new Set(e.tags||[]);if(s.length>0){for(let l of s){let d=n.has(l);r.addItem(c=>{c.setTitle(`${d?"\u2713 ":"   "}${this.formatPlotlineName(l)}`).onClick(async()=>{let p=d?(e.tags||[]).filter(f=>f!==l):[...e.tags||[],l];await this.sceneManager.updateScene(e.filePath,{tags:p}),this.refresh()})})}r.addSeparator()}r.addItem(l=>{l.setTitle("+ Create new plotline\u2026").setIcon("plus").onClick(()=>this.openNewPlotlineForScene(e))});let i=a.getBoundingClientRect();r.showAtPosition({x:i.left,y:i.bottom})}openRenamePlotlineModal(e){let a=new W.Modal(this.app);a.titleEl.setText("Rename Plotline");let r=e;new W.Setting(a.contentEl).setName("Plotline name").setDesc(`Current tag: "${e}". The tag will be updated in all scenes that use it.`).addText(s=>{s.setValue(e),s.onChange(n=>r=n)}),new W.Setting(a.contentEl).addButton(s=>{s.setButtonText("Rename").setCta().onClick(async()=>{let n=r.trim().toLowerCase().replace(/\s+/g,"-");if(!n||n===e){a.close();return}let i=await this.sceneManager.renameTag(e,n);new W.Notice(`Renamed plotline in ${i} scene${i!==1?"s":""}`),this.refresh(),a.close()})}),a.open()}confirmDeletePlotline(e,a){let r=new W.Modal(this.app);r.titleEl.setText("Delete Plotline"),r.contentEl.createEl("p",{text:`Remove the tag "${e}" from ${a} scene${a!==1?"s":""}? The scenes themselves will not be deleted.`}),new W.Setting(r.contentEl).addButton(s=>{s.setButtonText("Cancel").onClick(()=>r.close())}).addButton(s=>{s.setButtonText("Delete").setWarning().onClick(async()=>{let n=await this.sceneManager.deleteTag(e);new W.Notice(`Removed plotline from ${n} scene${n!==1?"s":""}`),this.refresh(),r.close()})}),r.open()}openNewPlotlineForScene(e){let a=new W.Modal(this.app);a.titleEl.setText("New Plotline");let r="";new W.Setting(a.contentEl).setName("Plotline name").setDesc(`Will be added to "${e.title||"Untitled"}"`).addText(s=>{s.setPlaceholder("e.g. main-mystery"),s.onChange(n=>r=n)}),new W.Setting(a.contentEl).addButton(s=>{s.setButtonText("Create & Assign").setCta().onClick(async()=>{if(!r.trim())return;let n=r.trim().toLowerCase().replace(/\s+/g,"-"),i=[...e.tags||[],n];await this.sceneManager.updateScene(e.filePath,{tags:i}),this.refresh(),a.close()})}),a.open()}openNewPlotlineModal(){let e=new W.Modal(this.app);e.titleEl.setText("New Plotline");let a="";new W.Setting(e.contentEl).setName("Plotline name").setDesc("Enter a name for the plotline. It will be stored as a tag on each assigned scene.").addText(l=>{l.setPlaceholder("e.g. love-triangle"),l.onChange(d=>a=d)});let r=e.contentEl.createDiv("storyline-scene-picker");r.createEl("p",{cls:"setting-item-description",text:"Select scenes to include (optional):"});let s=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"}),n=new Set,i=r.createDiv("storyline-scene-picker-list");s.forEach(l=>{var p,f;let d=i.createDiv("storyline-scene-picker-row"),c=d.createEl("input",{type:"checkbox"});d.createSpan({text:`[${String((p=l.act)!=null?p:"?").toString().padStart(2,"0")}-${String((f=l.sequence)!=null?f:"?").toString().padStart(2,"0")}] ${l.title||"Untitled"}`}),c.addEventListener("change",()=>{c.checked?n.add(l.filePath):n.delete(l.filePath)})}),new W.Setting(e.contentEl).addButton(l=>{l.setButtonText("Create Plotline").setCta().onClick(async()=>{if(!a.trim())return;let d=a.trim().toLowerCase().replace(/\s+/g,"-");for(let c of n){let p=this.sceneManager.getScene(c);if(p){let f=[...p.tags||[],d];await this.sceneManager.updateScene(c,{tags:f})}}this.refresh(),e.close()})}),e.open()}openAddSceneToPlotlineModal(e,a,r){let s=new W.Modal(this.app);s.titleEl.setText(`Add scenes to "${this.formatPlotlineName(e)}"`);let n=new Set(a.map(d=>d.filePath)),i=r.filter(d=>!n.has(d.filePath)),l=new Set;if(i.length===0)s.contentEl.createEl("p",{text:"All scenes are already in this plotline."});else{let d=s.contentEl.createDiv("storyline-scene-picker-list");i.forEach(c=>{var g,u;let p=d.createDiv("storyline-scene-picker-row"),f=p.createEl("input",{type:"checkbox"});p.createSpan({text:`[${String((g=c.act)!=null?g:"?").toString().padStart(2,"0")}-${String((u=c.sequence)!=null?u:"?").toString().padStart(2,"0")}] ${c.title||"Untitled"}`}),f.addEventListener("change",()=>{f.checked?l.add(c.filePath):l.delete(c.filePath)})})}new W.Setting(s.contentEl).addButton(d=>{d.setButtonText("Add to Plotline").setCta().onClick(async()=>{for(let c of l){let p=this.sceneManager.getScene(c);if(p){let f=[...p.tags||[],e];await this.sceneManager.updateScene(c,{tags:f})}}this.refresh(),s.close()})}),s.open()}groupByPlotline(e){let a=new Map;for(let r of e)if(!(!r.tags||r.tags.length===0))for(let s of r.tags)a.has(s)||a.set(s,[]),a.get(s).push(r);return a}formatPlotlineName(e){return(e.split("/").pop()||e).replace(/[-_]/g," ").split(" ").map(r=>r.length>0?r.charAt(0).toUpperCase()+r.slice(1):"").join(" ")}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof W.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new W.Notice(`Could not find file: ${e.filePath}`)}refresh(){this.rootContainer&&this.renderView(this.rootContainer)}};var j=require("obsidian"),G=lt(require("obsidian"));var B6=[{title:"Basic Information",icon:"user",fields:[{key:"name",label:"Name",placeholder:"Full name of the character"},{key:"nickname",label:"Nickname / Alias",placeholder:"Alternative names and their origins"},{key:"age",label:"Age",placeholder:"Date of birth, current life stage"},{key:"role",label:"Role in Story",placeholder:"Protagonist, antagonist, mentor, sidekick\u2026"},{key:"occupation",label:"Occupation",placeholder:"Current job, income level, career history"},{key:"residency",label:"Residency",placeholder:"Where they are from and where they currently live"},{key:"locations",label:"Locations",placeholder:"Story locations they appear at (e.g. The Tavern, Castle Ruins)"},{key:"family",label:"Family / Background",placeholder:"Relationships with parents, siblings, spouse\u2026",multiline:!0}]},{title:"Relationships",icon:"users",fields:[{key:"allies",label:"Allies & Friends",placeholder:"Who they trust"},{key:"enemies",label:"Enemies & Rivals",placeholder:"Who they are in conflict with"},{key:"romantic",label:"Romantic",placeholder:"Love interests, partners, exes"},{key:"mentors",label:"Mentors",placeholder:"Teachers, guides, role models"},{key:"otherRelations",label:"Other Connections",placeholder:"Any other notable relationships"}]},{title:"Physical Characteristics",icon:"scan-face",fields:[{key:"appearance",label:"Appearance",placeholder:"Height, weight, body type, hair, eye color, skin tone",multiline:!0},{key:"distinguishingFeatures",label:"Distinguishing Features",placeholder:"Scars, tattoos, birthmarks, or unique marks"},{key:"style",label:"Style",placeholder:"Clothing style, accessories, posture"},{key:"quirks",label:"Quirks",placeholder:"Specific habits like tapping fingers, stuttering when nervous\u2026",multiline:!0}]},{title:"Personality",icon:"brain",fields:[{key:"personality",label:"Personality",placeholder:"Three to five words to describe them"},{key:"internalMotivation",label:"Internal Motivation",placeholder:"What they need \u2014 their deepest unspoken drive"},{key:"externalMotivation",label:"External Motivation",placeholder:"What they want \u2014 their stated or visible goal"},{key:"strengths",label:"Strengths",placeholder:"Their best qualities"},{key:"flaws",label:"Flaws",placeholder:"Their fatal flaws"},{key:"fears",label:"Fears",placeholder:"What they are most afraid of \u2014 the thing stopping them from going after their desire"},{key:"belief",label:"Belief",placeholder:"What they believe about themselves and their identity"},{key:"misbelief",label:"Misbelief",placeholder:"The thing they believe is true about the world (but isn't)",multiline:!0}]},{title:"Backstory",icon:"clock",fields:[{key:"formativeMemories",label:"Formative Memories",placeholder:"Key events from childhood or past that shaped their personality",multiline:!0},{key:"accomplishments",label:"Accomplishments / Failures",placeholder:"Defining moments that shaped their self-worth",multiline:!0},{key:"secrets",label:"Secrets",placeholder:"What they are hiding",multiline:!0}]},{title:"Character Arc",icon:"trending-up",fields:[{key:"startingPoint",label:"Starting Point",placeholder:"How they are at the beginning of the story",multiline:!0},{key:"goal",label:"Goal",placeholder:"What they want to achieve"},{key:"expectedChange",label:"Expected Change",placeholder:"How they will change by the end of the story",multiline:!0}]},{title:"Other",icon:"more-horizontal",fields:[{key:"habits",label:"Habits",placeholder:"Hobbies, favorite foods, daily routines",multiline:!0},{key:"props",label:"Props",placeholder:"Items they frequently use or carry"}]}],g8=["name","nickname","age","role","occupation","residency","locations","family","appearance","distinguishingFeatures","style","quirks","personality","internalMotivation","externalMotivation","strengths","flaws","fears","belief","misbelief","formativeMemories","accomplishments","secrets","allies","enemies","romantic","mentors","otherRelations","startingPoint","goal","expectedChange","habits","props"],W8=["nickname","age","occupation","family","appearance","distinguishingFeatures","style","quirks","personality","internalMotivation","externalMotivation","strengths","flaws","fears","belief","misbelief","formativeMemories","accomplishments","secrets","startingPoint","goal","expectedChange","habits","props","notes"],Z8=["residency"];function v8(E,o){let e=new Map,a=/#([A-Za-z0-9][A-Za-z0-9_-]*)/g;for(let n of Z8){let i=E[n];if(typeof i!="string"||!i)continue;let l;for(;(l=a.exec(i))!==null;){let d=l[1].toLowerCase();e.has(d)||e.set(d,{name:l[1],autoType:"location"})}a.lastIndex=0}for(let n of W8){let i=E[n];if(typeof i!="string"||!i)continue;let l;for(;(l=a.exec(i))!==null;){let d=l[1].toLowerCase();e.has(d)||e.set(d,{name:l[1],autoType:"prop"})}a.lastIndex=0}if(E.custom)for(let n of Object.values(E.custom)){if(typeof n!="string"||!n)continue;let i;for(;(i=a.exec(n))!==null;){let l=i[1].toLowerCase();e.has(l)||e.set(l,{name:i[1],autoType:"prop"})}a.lastIndex=0}let r=["locations"];for(let n of r){let i=E[n];if(Array.isArray(i))for(let l of i){if(typeof l!="string"||!l)continue;let d;for(;(d=a.exec(l))!==null;){let c=d[1].toLowerCase();e.has(c)||e.set(c,{name:d[1],autoType:"location"})}a.lastIndex=0}}let s=[];for(let[n,i]of e){let l=o==null?void 0:o[n];s.push({name:i.name,type:l||i.autoType})}return s}function R6(E,o){return v8(E,o).filter(e=>e.type==="prop").map(e=>e.name)}function I6(E,o){return v8(E,o).filter(e=>e.type==="location").map(e=>e.name)}var n8=["Protagonist","Antagonist","Deuteragonist","Mentor","Sidekick","Love Interest","Foil","Supporting","Minor"];var ft=require("obsidian");var Vt=class{constructor(o){this.characters=new Map;this.app=o}async loadCharacters(o){this.characters.clear();let e=this.app.vault.adapter;if(!await e.exists(o))return[];let a=await e.list(o);for(let r of a.files)if(r.endsWith(".md"))try{let s=await e.read(r),n=this.parseCharacterContent(s,r);n&&this.characters.set(r,n)}catch(s){}return this.getAllCharacters()}getAllCharacters(){return Array.from(this.characters.values()).sort((o,e)=>o.name.toLowerCase().localeCompare(e.name.toLowerCase()))}getCharacter(o){return this.characters.get(o)}findByName(o){let e=o.toLowerCase();for(let a of this.characters.values())if(a.name.toLowerCase()===e||a.nickname&&a.nickname.toLowerCase().includes(e))return a}async createCharacter(o,e){await this.ensureFolder(o);let a=e.replace(/[\\/:*?"<>|]/g,"-"),r=(0,ft.normalizePath)(`${o}/${a}.md`);if(this.app.vault.getAbstractFileByPath(r))throw new Error(`Character file already exists: ${r}`);let s=new Date().toISOString().split("T")[0],i=`---
${(0,ft.stringifyYaml)({type:"character",name:e,created:s,modified:s})}---
`;await this.app.vault.create(r,i);let l={filePath:r,type:"character",name:e,created:s,modified:s};return this.characters.set(r,l),l}async saveCharacter(o){var d;let e=this.app.vault.getAbstractFileByPath(o.filePath);if(!(e instanceof ft.TFile))throw new Error(`Character file not found: ${o.filePath}`);let a=await this.app.vault.read(e),r=this.extractFrontmatter(a)||{},s=this.extractBody(a),n={...r};n.type="character",n.name=o.name,n.modified=new Date().toISOString().split("T")[0],o.created&&(n.created=o.created);for(let c of g8){if(c==="name")continue;let p=o[c];p!=null&&p!==""&&!(Array.isArray(p)&&p.length===0)?n[c]=p:delete n[c]}delete n.coreBeliefs,delete n.romanticHistory,o.custom&&Object.keys(o.custom).length>0?n.custom=o.custom:delete n.custom;let i=(d=o.notes)!=null?d:s,l=`---
${(0,ft.stringifyYaml)(n)}---
${i?`
`+i:""}`;await this.app.vault.modify(e,l),this.characters.set(o.filePath,{...o})}async deleteCharacter(o){let e=this.app.vault.getAbstractFileByPath(o);e instanceof ft.TFile&&await this.app.vault.trash(e,!0),this.characters.delete(o)}async renameCharacter(o,e,a){let r=e.replace(/[\\/:*?"<>|]/g,"-"),s=(0,ft.normalizePath)(`${a}/${r}.md`),n=this.app.vault.getAbstractFileByPath(o.filePath);n instanceof ft.TFile&&s!==o.filePath&&await this.app.fileManager.renameFile(n,s),this.characters.delete(o.filePath);let i={...o,filePath:s,name:e};return this.characters.set(s,i),await this.saveCharacter(i),i}async parseCharacterFile(o){let e=await this.app.vault.read(o);return this.parseCharacterContent(e,o.path)}parseCharacterContent(o,e){var i,l;let a=this.extractFrontmatter(o);if(!a||a.type!=="character")return null;let r=this.extractBody(o),s=(l=(i=e.split("/").pop())==null?void 0:i.replace(/\.md$/i,""))!=null?l:e;return{filePath:e,type:"character",name:a.name||s,nickname:a.nickname,age:a.age!=null?String(a.age):void 0,role:a.role,occupation:a.occupation,residency:a.residency,locations:Array.isArray(a.locations)?a.locations:a.locations?String(a.locations).split(",").map(d=>d.trim()).filter(Boolean):void 0,family:a.family,appearance:a.appearance,distinguishingFeatures:a.distinguishingFeatures,style:a.style,quirks:a.quirks,personality:a.personality,internalMotivation:a.internalMotivation,externalMotivation:a.externalMotivation,strengths:a.strengths,flaws:a.flaws,fears:a.fears,belief:a.belief||a.coreBeliefs,misbelief:a.misbelief,formativeMemories:a.formativeMemories,accomplishments:a.accomplishments,secrets:a.secrets,allies:Array.isArray(a.allies)?a.allies:a.allies?String(a.allies).split(",").map(d=>d.trim()).filter(Boolean):void 0,enemies:Array.isArray(a.enemies)?a.enemies:a.enemies?String(a.enemies).split(",").map(d=>d.trim()).filter(Boolean):void 0,romantic:Array.isArray(a.romantic)?a.romantic:a.romantic?String(a.romantic).split(",").map(d=>d.trim()).filter(Boolean):void 0,mentors:Array.isArray(a.mentors)?a.mentors:a.mentors?String(a.mentors).split(",").map(d=>d.trim()).filter(Boolean):void 0,otherRelations:Array.isArray(a.otherRelations)?a.otherRelations:a.otherRelations?String(a.otherRelations).split(",").map(d=>d.trim()).filter(Boolean):void 0,startingPoint:a.startingPoint,goal:a.goal,expectedChange:a.expectedChange,habits:a.habits,props:a.props,custom:a.custom&&typeof a.custom=="object"?a.custom:void 0,created:a.created,modified:a.modified,notes:r||void 0}}extractFrontmatter(o){let e=o.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!e)return null;try{return(0,ft.parseYaml)(e[1])}catch(a){return null}}extractBody(o){let e=o.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);return e?e[1].trim():""}async ensureFolder(o){this.app.vault.getAbstractFileByPath(o)||await this.app.vault.createFolder(o)}};function Bt(E,o){return getComputedStyle(document.body).getPropertyValue(E).trim()||o}function y8(){return{ally:Bt("--sl-rel-ally","#4CAF50"),enemy:Bt("--sl-rel-enemy","#F44336"),romantic:Bt("--sl-rel-romantic","#E91E63"),family:Bt("--sl-rel-family","#FF9800"),mentor:Bt("--sl-rel-mentor","#9C27B0"),other:Bt("--sl-rel-other","#9E9E9E")}}var M8={ally:"",enemy:"6,3",romantic:"2,4",family:"",mentor:"8,3,2,3",other:"4,4"},$6=class{constructor(o,e,a){this.nodes=[];this.edges=[];this.svg=null;this.width=800;this.height=500;this.animFrame=0;this.dragging=null;this.panX=0;this.panY=0;this.isPanning=!1;this.panStart={x:0,y:0};this.zoom=1;this.container=o,this.characters=e,this.onSelectCharacter=a}render(){if(this.container.empty(),this.buildGraph(),this.nodes.length===0){this.container.createDiv("relationship-map-empty").createEl("p",{text:"No relationships to display. Add allies, enemies, or romantic history to your characters."});return}let o=this.container.createDiv("relationship-map-legend"),e=y8();for(let[n,i]of Object.entries(e)){let l=o.createDiv("relationship-map-legend-item"),d=l.createEl("span",{cls:"relationship-map-legend-swatch"});d.style.backgroundColor=i,n==="enemy"&&(d.style.borderStyle="dashed"),n==="romantic"&&(d.style.borderRadius="50%"),l.createEl("span",{text:n.charAt(0).toUpperCase()+n.slice(1)})}let a=this.container.createDiv("relationship-map-wrapper"),r=a.getBoundingClientRect();this.width=Math.max(600,r.width||800),this.height=Math.max(400,r.height||500);let s="http://www.w3.org/2000/svg";this.svg=document.createElementNS(s,"svg"),this.svg.setAttribute("width","100%"),this.svg.setAttribute("height",String(this.height)),this.svg.setAttribute("viewBox",`0 0 ${this.width} ${this.height}`),this.svg.classList.add("relationship-map-svg"),a.appendChild(this.svg),this.svg.addEventListener("mousedown",n=>{n.target===this.svg&&(this.isPanning=!0,this.panStart={x:n.clientX-this.panX,y:n.clientY-this.panY})}),window.addEventListener("mousemove",n=>{this.isPanning&&(this.panX=n.clientX-this.panStart.x,this.panY=n.clientY-this.panStart.y,this.renderSVG())}),window.addEventListener("mouseup",()=>{this.isPanning=!1}),this.svg.addEventListener("wheel",n=>{n.preventDefault();let i=n.deltaY<0?1.1:.9,l=Math.min(5,Math.max(.2,this.zoom*i)),d=this.svg.getBoundingClientRect(),c=n.clientX-d.left,p=n.clientY-d.top;this.panX=c-(c-this.panX)*(l/this.zoom),this.panY=p-(p-this.panY)*(l/this.zoom),this.zoom=l,this.renderSVG()},{passive:!1}),this.runSimulation()}destroy(){this.animFrame&&cancelAnimationFrame(this.animFrame),this.animFrame=0}buildGraph(){let o=new Map,e=[];for(let s of this.characters){let n=s.name.toLowerCase();o.has(n)||o.set(n,{id:n,label:s.name,role:s.role,x:this.width/2+(Math.random()-.5)*this.width*.6,y:this.height/2+(Math.random()-.5)*this.height*.6,vx:0,vy:0,hasProfile:!0})}for(let s of this.characters){let n=s.name.toLowerCase();if(s.allies&&Array.isArray(s.allies))for(let i of s.allies)this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"ally"});else if(s.allies&&typeof s.allies=="string")for(let i of this.parseNames(s.allies))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"ally"});if(s.enemies&&Array.isArray(s.enemies))for(let i of s.enemies)this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"enemy"});else if(s.enemies&&typeof s.enemies=="string")for(let i of this.parseNames(s.enemies))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"enemy"});if(s.family)for(let i of this.parseNames(s.family))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"family"});if(s.romantic&&Array.isArray(s.romantic))for(let i of s.romantic)this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"romantic"});else if(s.romantic&&typeof s.romantic=="string")for(let i of this.parseNames(s.romantic))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"romantic"});if(s.mentors&&Array.isArray(s.mentors))for(let i of s.mentors)this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"mentor"});else if(s.mentors&&typeof s.mentors=="string")for(let i of this.parseNames(s.mentors))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"mentor"});if(s.otherRelations&&Array.isArray(s.otherRelations))for(let i of s.otherRelations)this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"other"});else if(s.otherRelations&&typeof s.otherRelations=="string")for(let i of this.parseNames(s.otherRelations))this.ensureNode(o,i),e.push({source:n,target:i.toLowerCase(),type:"other"})}let a=new Set,r=[];for(let s of e){let n=`${s.source}|${s.target}|${s.type}`,i=`${s.target}|${s.source}|${s.type}`;!a.has(n)&&!a.has(i)&&(a.add(n),r.push(s))}this.nodes=Array.from(o.values()),this.edges=r}ensureNode(o,e){let a=e.toLowerCase();o.has(a)||o.set(a,{id:a,label:e,x:this.width/2+(Math.random()-.5)*this.width*.6,y:this.height/2+(Math.random()-.5)*this.height*.6,vx:0,vy:0,hasProfile:!1})}parseNames(o){return o.replace(/\[\[([^\]]+)\]\]/g,"$1").split(/[,;\n]|\band\b/i).map(r=>r.trim()).filter(r=>r.length>0&&r.length<60)}runSimulation(){let o="http://www.w3.org/2000/svg",e=0,a=300,r=()=>{if(this.svg){e++,this.applyForces();for(let s of this.nodes)s!==this.dragging&&(s.x+=s.vx,s.y+=s.vy,s.vx*=.85,s.vy*=.85,s.x=Math.max(40,Math.min(this.width-40,s.x)),s.y=Math.max(40,Math.min(this.height-40,s.y)));this.renderSVG(),e<a&&(this.animFrame=requestAnimationFrame(r))}};this.animFrame=requestAnimationFrame(r)}applyForces(){for(let s=0;s<this.nodes.length;s++)for(let n=s+1;n<this.nodes.length;n++){let i=this.nodes[s],l=this.nodes[n],d=l.x-i.x,c=l.y-i.y,p=Math.max(1,Math.sqrt(d*d+c*c)),f=3e3/(p*p),g=d/p*f,u=c/p*f;i.vx-=g,i.vy-=u,l.vx+=g,l.vy+=u}for(let s of this.edges){let n=this.nodes.find(h=>h.id===s.source),i=this.nodes.find(h=>h.id===s.target);if(!n||!i)continue;let l=i.x-n.x,d=i.y-n.y,c=Math.max(1,Math.sqrt(l*l+d*d)),f=.02*(c-120),g=l/c*f,u=d/c*f;n.vx+=g,n.vy+=u,i.vx-=g,i.vy-=u}for(let s of this.nodes)s.vx+=(this.width/2-s.x)*.001,s.vy+=(this.height/2-s.y)*.001}renderSVG(){if(!this.svg)return;let o="http://www.w3.org/2000/svg";for(;this.svg.firstChild;)this.svg.removeChild(this.svg.firstChild);let e=y8(),a=document.createElementNS(o,"g");a.setAttribute("transform",`translate(${this.panX},${this.panY}) scale(${this.zoom})`),this.svg.appendChild(a);for(let r of this.edges){let s=this.nodes.find(l=>l.id===r.source),n=this.nodes.find(l=>l.id===r.target);if(!s||!n)continue;let i=document.createElementNS(o,"line");if(i.setAttribute("x1",String(s.x)),i.setAttribute("y1",String(s.y)),i.setAttribute("x2",String(n.x)),i.setAttribute("y2",String(n.y)),i.setAttribute("stroke",e[r.type]),i.setAttribute("stroke-width","2"),M8[r.type]&&i.setAttribute("stroke-dasharray",M8[r.type]),a.appendChild(i),r.label){let l=document.createElementNS(o,"text");l.setAttribute("x",String((s.x+n.x)/2)),l.setAttribute("y",String((s.y+n.y)/2-6)),l.setAttribute("text-anchor","middle"),l.setAttribute("fill",e[r.type]),l.setAttribute("font-size","10"),l.textContent=r.label,a.appendChild(l)}}for(let r of this.nodes){let s=document.createElementNS(o,"circle");s.setAttribute("cx",String(r.x)),s.setAttribute("cy",String(r.y)),s.setAttribute("r",r.hasProfile?"18":"12"),s.setAttribute("fill",r.hasProfile?"var(--interactive-accent)":"var(--background-modifier-border)"),s.setAttribute("stroke","var(--background-primary)"),s.setAttribute("stroke-width","2"),s.classList.add("relationship-map-node"),s.addEventListener("mousedown",i=>{i.stopPropagation(),this.dragging=r;let l=c=>{if(!this.svg)return;let p=this.svg.getBoundingClientRect();r.x=(c.clientX-p.left-this.panX)/this.zoom,r.y=(c.clientY-p.top-this.panY)/this.zoom,this.renderSVG()},d=()=>{this.dragging=null,window.removeEventListener("mousemove",l),window.removeEventListener("mouseup",d)};window.addEventListener("mousemove",l),window.addEventListener("mouseup",d)}),s.addEventListener("dblclick",()=>{this.onSelectCharacter&&r.hasProfile&&this.onSelectCharacter(r.label)}),a.appendChild(s);let n=document.createElementNS(o,"text");if(n.setAttribute("x",String(r.x)),n.setAttribute("y",String(r.y+(r.hasProfile?30:24))),n.setAttribute("text-anchor","middle"),n.setAttribute("fill","var(--text-normal)"),n.setAttribute("font-size",r.hasProfile?"12":"10"),n.setAttribute("font-weight",r.hasProfile?"600":"400"),n.textContent=r.label,a.appendChild(n),r.role&&r.hasProfile){let i=document.createElementNS(o,"text");i.setAttribute("x",String(r.x)),i.setAttribute("y",String(r.y-24)),i.setAttribute("text-anchor","middle"),i.setAttribute("fill","var(--text-muted)"),i.setAttribute("font-size","9"),i.textContent=r.role,a.appendChild(i)}}}};var S8=lt(require("obsidian"));function J(E,o){return getComputedStyle(document.body).getPropertyValue(E).trim()||o}function l8(){return{scene:J("--sl-sg-scene","#7C3AED"),character:J("--sl-sg-character","#2196F3"),location:J("--sl-sg-location","#4CAF50"),other:J("--sl-sg-other","#FF9800"),prop:J("--sl-sg-prop","#E91E63")}}function U8(E){switch(E){case"ally":return J("--sl-rel-ally","#4CAF50");case"enemy":return J("--sl-rel-enemy","#F44336");case"family":return J("--sl-rel-family","#FF9800");case"romantic":return J("--sl-rel-romantic","#E91E63");case"mentor":return J("--sl-rel-mentor","#9C27B0");case"other-rel":return J("--sl-rel-other","#9E9E9E");default:return l8()[E]||"#999"}}var b8={ally:"",enemy:"6,3",family:"3,3",romantic:"2,4",mentor:"8,3,2,3","other-rel":"4,4"},O6=class{constructor(o,e,a,r,s,n){this.nodes=[];this.edges=[];this.svg=null;this.width=900;this.height=600;this.animFrame=0;this.dragging=null;this.panX=0;this.panY=0;this.isPanning=!1;this.panStart={x:0,y:0};this.zoom=1;this.showCharacters=!0;this.showLocations=!0;this.showOther=!0;this.showRelationships=!0;this.showProps=!0;this.container=o,this.scenes=e,this.characters=a,this.scanResults=r,this.onSelectScene=s,this.tagTypeOverrides=n||{}}render(){if(this.container.empty(),this.buildGraph(),this.nodes.length===0){this.container.createDiv("story-graph-empty").createEl("p",{text:"No wikilinks detected in scene text. Write [[Character]] or [[Location]] in your scenes to see connections here."});return}this.renderFilterBar(),this.renderLegend();let o=this.container.createDiv("story-graph-wrapper"),e=o.getBoundingClientRect();this.width=Math.max(700,e.width||900),this.height=Math.max(450,e.height||600);let a="http://www.w3.org/2000/svg";this.svg=document.createElementNS(a,"svg"),this.svg.setAttribute("width","100%"),this.svg.setAttribute("height",String(this.height)),this.svg.setAttribute("viewBox",`0 0 ${this.width} ${this.height}`),this.svg.classList.add("story-graph-svg"),o.appendChild(this.svg),this.svg.addEventListener("mousedown",r=>{r.target===this.svg&&(this.isPanning=!0,this.panStart={x:r.clientX-this.panX,y:r.clientY-this.panY})}),window.addEventListener("mousemove",r=>{this.isPanning&&(this.panX=r.clientX-this.panStart.x,this.panY=r.clientY-this.panStart.y,this.renderSVG())}),window.addEventListener("mouseup",()=>{this.isPanning=!1}),this.svg.addEventListener("wheel",r=>{r.preventDefault();let s=r.deltaY<0?1.1:.9,n=Math.min(5,Math.max(.2,this.zoom*s)),i=this.svg.getBoundingClientRect(),l=r.clientX-i.left,d=r.clientY-i.top;this.panX=l-(l-this.panX)*(n/this.zoom),this.panY=d-(d-this.panY)*(n/this.zoom),this.zoom=n,this.renderSVG()},{passive:!1}),this.runSimulation()}destroy(){this.animFrame&&cancelAnimationFrame(this.animFrame),this.animFrame=0}renderFilterBar(){let o=this.container.createDiv("story-graph-filters"),e=(a,r,s,n)=>{let i=o.createEl("button",{cls:`story-graph-filter-btn ${s?"active":""}`}),l=i.createSpan();S8.setIcon(l,r),i.createSpan({text:` ${a}`}),i.addEventListener("click",()=>{let d=!i.hasClass("active");i.toggleClass("active",d),n(d),this.destroy(),this.buildGraph(),this.nodes.length>0&&this.runSimulation()})};e("Characters","user",this.showCharacters,a=>{this.showCharacters=a}),e("Locations","map-pin",this.showLocations,a=>{this.showLocations=a}),e("Relationships","heart-handshake",this.showRelationships,a=>{this.showRelationships=a}),e("Props","tag",this.showProps,a=>{this.showProps=a}),e("Other","file-text",this.showOther,a=>{this.showOther=a})}renderLegend(){let o=this.container.createDiv("story-graph-legend"),e=l8(),a=[["Scene","book-open","scene"],["Character","user","character"],["Location","map-pin","location"],["Prop","tag","prop"],["Other","file-text","other"]];for(let[s,n,i]of a){let l=o.createDiv("story-graph-legend-item"),d=l.createSpan({cls:"story-graph-legend-swatch"});d.style.backgroundColor=e[i],l.createSpan({text:s})}let r=[["Ally",J("--sl-rel-ally","#4CAF50")],["Enemy",J("--sl-rel-enemy","#F44336")],["Family",J("--sl-rel-family","#FF9800")],["Romantic",J("--sl-rel-romantic","#E91E63")],["Mentor",J("--sl-rel-mentor","#9C27B0")],["Other",J("--sl-rel-other","#9E9E9E")]];for(let[s,n]of r){let i=o.createDiv("story-graph-legend-item"),l=i.createSpan({cls:"story-graph-legend-swatch story-graph-legend-line"});l.style.borderBottomColor=n,i.createSpan({text:s})}}buildGraph(){let o=new Map,e=[],a=(s,n,i)=>(o.has(s)||o.set(s,{id:s,label:n,entityType:i,weight:0,x:this.width/2+(Math.random()-.5)*this.width*.6,y:this.height/2+(Math.random()-.5)*this.height*.6,vx:0,vy:0}),o.get(s));for(let s of this.scenes){let n=this.scanResults.get(s.filePath);if(!n||n.links.length===0)continue;let i=`scene::${s.filePath}`;a(i,s.title||"Untitled","scene");for(let l of n.links){let d=this.tagTypeOverrides[l.name.toLowerCase()]||l.type;if(d==="character"&&!this.showCharacters||d==="location"&&!this.showLocations||d==="other"&&!this.showOther||d==="prop"&&!this.showProps)continue;let c=`${d}::${l.name.toLowerCase()}`,p=a(c,l.name,d);o.get(i).weight++,p.weight++,e.push({source:i,target:c,kind:d})}}if(this.showRelationships&&this.showCharacters)for(let s of this.characters){let n=`character::${s.name.toLowerCase()}`,i=(l,d)=>{if(!l)return;let c=Array.isArray(l)?l:typeof l=="string"?l.split(/[,;]/).map(p=>p.replace(/\[\[|\]\]/g,"").trim()).filter(Boolean):[];for(let p of c){if(!p)continue;let f=`character::${p.toLowerCase()}`;a(n,s.name,"character"),a(f,p,"character");let g=`${n}|${f}|${d}`,u=`${f}|${n}|${d}`;e.some(h=>{let y=`${h.source}|${h.target}|${h.kind}`;return y===g||y===u})||(o.get(n).weight++,o.get(f).weight++,e.push({source:n,target:f,kind:d}))}};i(s.allies,"ally"),i(s.enemies,"enemy"),i(s.family,"family"),i(s.romantic,"romantic"),i(s.mentors,"mentor"),i(s.otherRelations,"other-rel")}if(this.showProps)for(let s of this.characters){let n=R6(s,this.tagTypeOverrides);if(n.length===0)continue;let i=`character::${s.name.toLowerCase()}`;a(i,s.name,"character");for(let l of n){let d=`prop::${l.toLowerCase()}`,c=a(d,`#${l}`,"prop");o.get(i).weight++,c.weight++,e.push({source:i,target:d,kind:"prop"})}}if(this.showLocations)for(let s of this.characters){let n=I6(s,this.tagTypeOverrides);if(n.length===0)continue;let i=`character::${s.name.toLowerCase()}`;a(i,s.name,"character");for(let l of n){let d=`location::${l.toLowerCase()}`,c=a(d,`#${l}`,"location");o.get(i).weight++,c.weight++,e.push({source:i,target:d,kind:"location"})}}if(this.showLocations)for(let s of this.characters){let n=s.locations;if(!n||n.length===0)continue;let i=`character::${s.name.toLowerCase()}`;a(i,s.name,"character");for(let l of n){if(!l)continue;let d=l.replace(/^#/,"");if(!d)continue;let c=`location::${d.toLowerCase()}`,p=`${i}|${c}|location`;if(e.some(g=>`${g.source}|${g.target}|${g.kind}`===p))continue;let f=a(c,d,"location");o.get(i).weight++,f.weight++,e.push({source:i,target:c,kind:"location"})}}let r=new Set(e.map(s=>s.source));for(let[s,n]of o)n.entityType==="scene"&&!r.has(s)&&o.delete(s);this.nodes=Array.from(o.values()),this.edges=e}runSimulation(){let o=0,e=350,a=()=>{if(this.svg){o++,this.applyForces();for(let r of this.nodes)r!==this.dragging&&(r.x+=r.vx,r.y+=r.vy,r.vx*=.82,r.vy*=.82,r.x=Math.max(50,Math.min(this.width-50,r.x)),r.y=Math.max(50,Math.min(this.height-50,r.y)));this.renderSVG(),o<e&&(this.animFrame=requestAnimationFrame(a))}};this.animFrame=requestAnimationFrame(a)}applyForces(){for(let s=0;s<this.nodes.length;s++)for(let n=s+1;n<this.nodes.length;n++){let i=this.nodes[s],l=this.nodes[n],d=l.x-i.x,c=l.y-i.y,p=Math.max(1,Math.sqrt(d*d+c*c)),f=4e3/(p*p),g=d/p*f,u=c/p*f;i.vx-=g,i.vy-=u,l.vx+=g,l.vy+=u}for(let s of this.edges){let n=this.nodes.find(h=>h.id===s.source),i=this.nodes.find(h=>h.id===s.target);if(!n||!i)continue;let l=i.x-n.x,d=i.y-n.y,c=Math.max(1,Math.sqrt(l*l+d*d)),f=.025*(c-100),g=l/c*f,u=d/c*f;n.vx+=g,n.vy+=u,i.vx-=g,i.vy-=u}for(let s of this.nodes)s.vx+=(this.width/2-s.x)*.0012,s.vy+=(this.height/2-s.y)*.0012}renderSVG(){if(!this.svg)return;let o="http://www.w3.org/2000/svg";for(;this.svg.firstChild;)this.svg.removeChild(this.svg.firstChild);let e=l8(),a=document.createElementNS(o,"g");a.setAttribute("transform",`translate(${this.panX},${this.panY}) scale(${this.zoom})`),this.svg.appendChild(a);for(let r of this.edges){let s=this.nodes.find(d=>d.id===r.source),n=this.nodes.find(d=>d.id===r.target);if(!s||!n)continue;let i=document.createElementNS(o,"line");i.setAttribute("x1",String(s.x)),i.setAttribute("y1",String(s.y)),i.setAttribute("x2",String(n.x)),i.setAttribute("y2",String(n.y)),i.setAttribute("stroke",U8(r.kind));let l=r.kind==="ally"||r.kind==="enemy"||r.kind==="family";i.setAttribute("stroke-width",l?"2":"1.5"),i.setAttribute("stroke-opacity",l?"0.65":"0.45"),b8[r.kind]&&i.setAttribute("stroke-dasharray",b8[r.kind]),a.appendChild(i)}for(let r of this.nodes){let s=e[r.entityType],n=this.nodeRadius(r);if(r.entityType==="scene"){let c=document.createElementNS(o,"rect"),p=n*2.4,f=n*1.6;c.setAttribute("x",String(r.x-p/2)),c.setAttribute("y",String(r.y-f/2)),c.setAttribute("width",String(p)),c.setAttribute("height",String(f)),c.setAttribute("rx","4"),c.setAttribute("fill",s),c.setAttribute("fill-opacity","0.85"),c.setAttribute("stroke","var(--background-primary)"),c.setAttribute("stroke-width","2"),c.classList.add("story-graph-node","story-graph-node-scene"),this.wireNodeEvents(c,r),a.appendChild(c)}else if(r.entityType==="location"){let c=n,p=document.createElementNS(o,"polygon");p.setAttribute("points",[`${r.x},${r.y-c}`,`${r.x+c},${r.y}`,`${r.x},${r.y+c}`,`${r.x-c},${r.y}`].join(" ")),p.setAttribute("fill",s),p.setAttribute("fill-opacity","0.85"),p.setAttribute("stroke","var(--background-primary)"),p.setAttribute("stroke-width","2"),p.classList.add("story-graph-node","story-graph-node-location"),this.wireNodeEvents(p,r),a.appendChild(p)}else if(r.entityType==="prop"){let c=n*.9,p=document.createElementNS(o,"polygon"),f=[];for(let g=0;g<6;g++){let u=Math.PI/3*g-Math.PI/6;f.push(`${r.x+c*Math.cos(u)},${r.y+c*Math.sin(u)}`)}p.setAttribute("points",f.join(" ")),p.setAttribute("fill",s),p.setAttribute("fill-opacity","0.85"),p.setAttribute("stroke","var(--background-primary)"),p.setAttribute("stroke-width","2"),p.classList.add("story-graph-node","story-graph-node-prop"),this.wireNodeEvents(p,r),a.appendChild(p)}else{let c=document.createElementNS(o,"circle");c.setAttribute("cx",String(r.x)),c.setAttribute("cy",String(r.y)),c.setAttribute("r",String(n)),c.setAttribute("fill",s),c.setAttribute("fill-opacity","0.85"),c.setAttribute("stroke","var(--background-primary)"),c.setAttribute("stroke-width","2"),c.classList.add("story-graph-node",`story-graph-node-${r.entityType}`),this.wireNodeEvents(c,r),a.appendChild(c)}let i=document.createElementNS(o,"text"),l=r.entityType==="scene"?r.y+this.nodeRadius(r)*1.6/2+14:r.y+this.nodeRadius(r)+14;i.setAttribute("x",String(r.x)),i.setAttribute("y",String(l)),i.setAttribute("text-anchor","middle"),i.setAttribute("fill","var(--text-normal)"),i.setAttribute("font-size",r.entityType==="scene"?"10":"11"),i.setAttribute("font-weight",r.entityType==="scene"?"400":"600");let d=r.entityType==="scene"?18:16;i.textContent=r.label.length>d?r.label.substring(0,d-1)+"\u2026":r.label,a.appendChild(i)}}nodeRadius(o){return(o.entityType==="scene"?10:14)+Math.min(o.weight*1.5,12)}wireNodeEvents(o,e){o.addEventListener("mousedown",a=>{a.stopPropagation(),this.dragging=e;let r=n=>{if(!this.svg)return;let i=this.svg.getBoundingClientRect();e.x=(n.clientX-i.left-this.panX)/this.zoom,e.y=(n.clientY-i.top-this.panY)/this.zoom,this.renderSVG()},s=()=>{this.dragging=null,window.removeEventListener("mousemove",r),window.removeEventListener("mouseup",s)};window.addEventListener("mousemove",r),window.addEventListener("mouseup",s)}),e.entityType==="scene"&&this.onSelectScene&&o.addEventListener("dblclick",()=>{let a=e.id.replace("scene::","");this.onSelectScene(a)}),o.style.cursor="grab"}};var q6=class q6 extends j.ItemView{constructor(e,a,r){super(e);this.selectedCharacter=null;this.rootContainer=null;this.collapsedSections=new Set;this.autoSaveTimer=null;this.pendingSaveDraft=null;this.undoSnapshot=null;this._lastSaveTime=0;this.viewMode="grid";this.relationshipMap=null;this.storyGraph=null;this.plugin=a,this.sceneManager=r,this.characterManager=new Vt(this.app)}getViewType(){return vt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"users"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-character-container"),this.rootContainer=e,await this.sceneManager.initialize(),await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder()),this.renderView(e)}async onClose(){await this.flushPendingSave()}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");a.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(a,vt,this.plugin,this.leaf);let s=a.createDiv("story-line-toolbar-controls");if(!this.selectedCharacter){let l=s.createDiv("character-mode-toggle"),d=l.createEl("button",{cls:`character-mode-btn ${this.viewMode==="grid"?"active":""}`}),c=d.createSpan();G.setIcon(c,"layout-grid"),d.createSpan({text:" Grid"}),d.addEventListener("click",()=>{this.viewMode!=="grid"&&(this.viewMode="grid",this.rootContainer&&this.renderView(this.rootContainer))});let p=l.createEl("button",{cls:`character-mode-btn ${this.viewMode==="map"?"active":""}`}),f=p.createSpan();G.setIcon(f,"waypoints"),p.createSpan({text:" Map"}),p.addEventListener("click",()=>{this.viewMode!=="map"&&(this.viewMode="map",this.rootContainer&&this.renderView(this.rootContainer))});let g=l.createEl("button",{cls:`character-mode-btn ${this.viewMode==="story-graph"?"active":""}`}),u=g.createSpan();G.setIcon(u,"share-2"),g.createSpan({text:" Story Graph"}),g.addEventListener("click",()=>{this.viewMode!=="story-graph"&&(this.viewMode="story-graph",this.rootContainer&&this.renderView(this.rootContainer))})}s.createEl("button",{cls:"mod-cta character-add-btn",text:"+ New Character"}).addEventListener("click",()=>this.promptNewCharacter());let i=e.createDiv("story-line-character-content");this.relationshipMap&&(this.relationshipMap.destroy(),this.relationshipMap=null),this.storyGraph&&(this.storyGraph.destroy(),this.storyGraph=null),this.selectedCharacter?this.renderCharacterDetail(i):this.viewMode==="map"?this.renderRelationshipMap(i):this.viewMode==="story-graph"?this.renderStoryGraph(i):this.renderCharacterOverview(i)}renderCharacterOverview(e){e.empty(),e.createEl("h3",{text:"Characters"});let a=this.characterManager.getAllCharacters(),r=this.sceneManager.getAllCharacters(),s=this.sceneManager.getAllScenes();if(a.length>0||r.length>0){let n=e.createDiv("character-overview-grid");for(let d of a)this.renderOverviewCard(n,d,s);let i=new Set(a.map(d=>d.name.toLowerCase())),l=r.filter(d=>!i.has(d.toLowerCase()));if(l.length>0){a.length>0&&e.createDiv("character-unlinked-divider").createEl("span",{text:"Characters from scenes (no profile yet)"});let d=e.createDiv("character-overview-grid");for(let c of l)this.renderUnlinkedCard(d,c,s)}}else{let n=e.createDiv("character-empty-state"),i=n.createDiv("character-empty-icon");G.setIcon(i,"user-plus"),n.createEl("h4",{text:"No characters yet"}),n.createEl("p",{text:'Click "+ New Character" to create your first character profile, or add characters to your scene frontmatter.'})}}renderOverviewCard(e,a,r){let s=e.createDiv("character-overview-card");if(a.role){let b=s.createDiv("character-role-badge");b.textContent=a.role,b.addClass(this.roleClass(a.role))}s.createEl("h4",{text:a.name});let n=a.personality||a.occupation||a.age||"";n&&s.createEl("p",{cls:"character-card-snippet",text:n});let i=a.name.toLowerCase(),l=r.filter(b=>{var A;return((A=b.pov)==null?void 0:A.toLowerCase())===i}).length,d=r.filter(b=>{var A,S;return((A=b.characters)==null?void 0:A.some(L=>L.toLowerCase()===i))&&((S=b.pov)==null?void 0:S.toLowerCase())!==i}).length,c=l+d,p=s.createDiv("character-card-stats");c>0?(p.createSpan({text:`${l} POV`}),p.createSpan({cls:"character-stat-sep",text:"\xB7"}),p.createSpan({text:`${c} scenes`})):p.createSpan({cls:"character-stat-none",text:"No scenes yet"});let f=B6.reduce((b,A)=>b+A.fields.filter(S=>{let L=a[S.key];return L!=null&&L!==""}).length,0),g=B6.reduce((b,A)=>b+A.fields.length,0),u=Math.round(f/g*100),h=s.createDiv("character-card-completeness"),x=h.createDiv("character-completeness-bar").createDiv("character-completeness-fill");x.style.width=`${u}%`,h.createSpan({cls:"character-completeness-label",text:`${u}% complete`});let m=this.plugin.settings.tagTypeOverrides,v=R6(a,m),M=I6(a,m);if(M.length>0||v.length>0){let b=s.createDiv("character-card-props");M.forEach(S=>{let L=b.createSpan({cls:"character-prop-tag character-loc-tag",text:`#${S}`});m[S.toLowerCase()]&&L.addClass("tag-overridden"),this.addTagContextMenu(L,S)}),v.slice(0,5).forEach(S=>{let L=b.createSpan({cls:"character-prop-tag",text:`#${S}`});m[S.toLowerCase()]&&L.addClass("tag-overridden"),this.addTagContextMenu(L,S)}),M.length+v.length>5+M.length&&b.createSpan({cls:"character-prop-more",text:`+${v.length-5}`})}s.addEventListener("click",()=>{this.selectedCharacter=a.filePath,this.renderView(this.rootContainer)})}renderUnlinkedCard(e,a,r){let s=e.createDiv("character-overview-card character-unlinked");s.createEl("h4",{text:a});let n=a.toLowerCase(),i=r.filter(p=>{var f;return((f=p.pov)==null?void 0:f.toLowerCase())===n}).length,l=r.filter(p=>{var f,g;return((f=p.characters)==null?void 0:f.some(u=>u.toLowerCase()===n))&&((g=p.pov)==null?void 0:g.toLowerCase())!==n}).length;s.createDiv("character-card-stats").createSpan({text:`${i} POV \xB7 ${i+l} scenes`}),s.createEl("button",{cls:"character-create-profile-btn",text:"Create Profile"}).addEventListener("click",async p=>{p.stopPropagation(),await this.createCharacterFromName(a)})}renderRelationshipMap(e){e.empty(),e.createEl("h3",{text:"Relationship Map"});let a=this.characterManager.getAllCharacters(),r=e.createDiv("relationship-map-container");this.relationshipMap=new $6(r,a,s=>{let n=a.find(i=>i.name===s);n&&(this.selectedCharacter=n.filePath,this.viewMode="grid",this.rootContainer&&this.renderView(this.rootContainer))}),this.relationshipMap.render()}renderStoryGraph(e){e.empty(),e.createEl("h3",{text:"Story Graph"});let a=this.sceneManager.getAllScenes(),r=this.characterManager.getAllCharacters(),s=this.plugin.linkScanner;s.rebuildLookups();let n=s.scanAll(a),i=e.createDiv("story-graph-container");this.storyGraph=new O6(i,a,r,n,l=>{this.app.vault.getAbstractFileByPath(l)&&this.app.workspace.openLinkText(l,"",!0)},this.plugin.settings.tagTypeOverrides),this.storyGraph.render()}renderCharacterDetail(e){e.empty();let a=this.characterManager.getCharacter(this.selectedCharacter);if(!a){this.selectedCharacter=null,this.renderCharacterOverview(e);return}let r={...a,custom:{...a.custom||{}}};this.undoSnapshot={...a,custom:{...a.custom||{}}};let s=e.createDiv("character-detail-header"),n=s.createEl("button",{cls:"character-back-btn"});G.setIcon(n,"arrow-left"),n.createSpan({text:" All Characters"}),n.addEventListener("click",()=>{this.selectedCharacter=null,this.renderView(this.rootContainer)});let i=s.createDiv("character-detail-header-right"),l=i.createEl("button",{cls:"character-delete-btn",attr:{title:"Delete character"}});G.setIcon(l,"trash-2"),l.addEventListener("click",()=>this.confirmDeleteCharacter(a));let d=i.createEl("button",{cls:"character-open-btn",attr:{title:"Open character file"}});G.setIcon(d,"file-text"),d.addEventListener("click",()=>this.openCharacterFile(a));let c=e.createDiv("character-detail-layout"),p=c.createDiv("character-detail-form"),f=c.createDiv("character-detail-side");for(let g of B6)this.renderCategory(p,g,r);this.renderCustomFields(p,r),this.renderScenePanel(f,a.name)}renderCategory(e,a,r){let s=e.createDiv("character-section"),n=this.collapsedSections.has(a.title),i=s.createDiv("character-section-header"),l=i.createSpan("character-section-chevron");G.setIcon(l,n?"chevron-right":"chevron-down");let d=i.createSpan("character-section-icon");G.setIcon(d,a.icon),i.createSpan({text:a.title});let c=s.createDiv("character-section-body");n&&(c.style.display="none"),i.addEventListener("click",()=>{this.collapsedSections.has(a.title)?(this.collapsedSections.delete(a.title),c.style.display="",G.setIcon(l,"chevron-down")):(this.collapsedSections.add(a.title),c.style.display="none",G.setIcon(l,"chevron-right"))});for(let p of a.fields)this.renderField(c,p,r)}renderField(e,a,r){var i;let s=e.createDiv("character-field-row");s.createEl("label",{cls:"character-field-label",text:a.label});let n=(i=r[a.key])!=null?i:"";if(a.key==="allies"||a.key==="enemies"){this.renderCharacterTagField(s,a,r);return}if(a.key==="role"){let l=s.createEl("select",{cls:"character-field-input dropdown"});l.createEl("option",{text:a.placeholder,value:""});for(let d of n8){let c=l.createEl("option",{text:d,value:d});n===d&&(c.selected=!0)}if(n&&!n8.includes(n)){let d=l.createEl("option",{text:n,value:n});d.selected=!0}l.addEventListener("change",()=>{r[a.key]=l.value,this.scheduleSave(r)})}else if(a.multiline){let l=s.createEl("textarea",{cls:"character-field-textarea",attr:{placeholder:a.placeholder,rows:"3"}});l.value=n,l.addEventListener("input",()=>{r[a.key]=l.value,this.scheduleSave(r)})}else{let l=s.createEl("input",{cls:"character-field-input",type:"text",attr:{placeholder:a.placeholder}});l.value=n,l.addEventListener("input",()=>{r[a.key]=l.value,this.scheduleSave(r)})}}renderCharacterTagField(e,a,r){let s=e.createDiv("character-tag-field"),n=Array.isArray(r[a.key])?[...r[a.key]]:[],l=this.characterManager.getAllCharacters().map(m=>m.name),d=this.sceneManager.getAllCharacters(),c=new Set([...l,...d]),p=Array.from(c).filter(m=>m!==r.name&&!n.includes(m)).sort((m,v)=>m.toLowerCase().localeCompare(v.toLowerCase())),f=s.createDiv("character-tag-list"),g=()=>{f.empty();for(let m of n){let v=f.createSpan("character-tag");v.createSpan({text:m}),v.createSpan({cls:"character-tag-remove",text:"\xD7"}).addEventListener("click",()=>{let b=n.indexOf(m);b>=0&&n.splice(b,1),r[a.key]=[...n],this.scheduleSave(r),g(),y()})}},u=s.createDiv("character-tag-add-row"),h=u.createEl("select",{cls:"character-field-input dropdown character-tag-select"}),y=()=>{h.empty(),h.createEl("option",{text:a.placeholder,value:""});let m=Array.from(c).filter(v=>v!==r.name&&!n.includes(v)).sort((v,M)=>v.toLowerCase().localeCompare(M.toLowerCase()));for(let v of m)h.createEl("option",{text:v,value:v})};y(),h.addEventListener("change",()=>{let m=h.value;m&&!n.includes(m)&&(n.push(m),r[a.key]=[...n],this.scheduleSave(r),g(),y())});let x=u.createEl("button",{cls:"clickable-icon character-tag-add-btn",attr:{"aria-label":"Create new character and add"}});G.setIcon(x,"plus"),x.addEventListener("click",async()=>{let m=new j.Modal(this.app);m.titleEl.setText("New Character");let v="";new j.Setting(m.contentEl).setName("Name").addText(A=>{A.setPlaceholder("Character name").onChange(S=>{v=S}),setTimeout(()=>A.inputEl.focus(),50)}),m.contentEl.createDiv("structure-close-row").createEl("button",{text:"Create & Add",cls:"mod-cta"}).addEventListener("click",async()=>{if(!v.trim())return;let A=v.trim();try{await this.characterManager.createCharacter(this.sceneManager.getCharacterFolder(),A)}catch(S){}n.includes(A)||(n.push(A),r[a.key]=[...n],this.scheduleSave(r),c.add(A),g(),y()),m.close()}),m.open()}),g()}renderCustomFields(e,a){let r=e.createDiv("character-section"),s="Custom Fields",n=this.collapsedSections.has(s),i=r.createDiv("character-section-header"),l=i.createSpan("character-section-chevron");G.setIcon(l,n?"chevron-right":"chevron-down");let d=i.createSpan("character-section-icon");G.setIcon(d,"plus-circle"),i.createSpan({text:s});let c=r.createDiv("character-section-body");n&&(c.style.display="none"),i.addEventListener("click",()=>{this.collapsedSections.has(s)?(this.collapsedSections.delete(s),c.style.display="",G.setIcon(l,"chevron-down")):(this.collapsedSections.add(s),c.style.display="none",G.setIcon(l,"chevron-right"))});let p=()=>{c.empty();let f=a.custom||{};for(let[h,y]of Object.entries(f)){let x=c.createDiv("character-field-row character-custom-row"),m=x.createEl("input",{cls:"character-field-input character-custom-key",type:"text",attr:{placeholder:"Field name"}});m.value=h;let v=x.createEl("input",{cls:"character-field-input character-custom-value",type:"text",attr:{placeholder:"Value"}});v.value=y;let M=x.createEl("button",{cls:"character-custom-remove",attr:{title:"Remove field"}});G.setIcon(M,"x"),m.addEventListener("change",()=>{delete a.custom[h];let b=m.value.trim();b&&(a.custom[b]=v.value),this.scheduleSave(a)}),v.addEventListener("input",()=>{let b=m.value.trim();b&&(a.custom[b]=v.value,this.scheduleSave(a))}),M.addEventListener("click",()=>{delete a.custom[h],x.remove(),this.scheduleSave(a)})}c.createDiv("character-custom-add-row").createEl("button",{cls:"character-custom-add-btn",text:"+ Add Field"}).addEventListener("click",()=>{a.custom||(a.custom={});let h=Object.keys(a.custom).length+1,y=`field_${h}`;for(;a.custom[y];)y=`field_${h}_${Date.now()}`;a.custom[y]="",p()})};p()}renderScenePanel(e,a){var u;let r=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"}),s=a.toLowerCase(),n=r.filter(h=>{var y;return((y=h.pov)==null?void 0:y.toLowerCase())===s}),i=r.filter(h=>{var y,x;return((y=h.pov)==null?void 0:y.toLowerCase())!==s&&((x=h.characters)==null?void 0:x.some(m=>m.toLowerCase()===s))}),l=[...n,...i],d=e.createDiv("character-side-stats");d.createEl("h4",{text:"Scene Presence"});let c=d.createDiv("character-stat-grid");this.renderStat(c,String(n.length),"POV"),this.renderStat(c,String(i.length),"Supporting"),this.renderStat(c,String(l.length),"Total");let p=l.length,f=l.filter(h=>h.status==="written"||h.status==="revised"||h.status==="final").length;if(p>0){let h=e.createDiv("character-progress");h.createEl("h4",{text:"Writing Progress"});let x=h.createDiv("character-progress-bar").createDiv("character-progress-filled"),m=Math.round(f/p*100);x.style.width=`${m}%`,h.createSpan({cls:"character-progress-label",text:`${f} of ${p} scenes written (${m}%)`})}if(r.length>0){let h=r.filter(x=>x.pov).length,y=h>0?Math.round(n.length/h*100):0;h>0&&e.createDiv("character-side-pov-dist").createEl("p",{text:`${y}% of all POV scenes`})}if(l.length>0){let h=e.createDiv("character-side-scenes");h.createEl("h4",{text:"Scenes"});for(let y of l){let x=h.createDiv("character-side-scene-item"),m=((u=y.pov)==null?void 0:u.toLowerCase())===s,v=y.act!==void 0?String(y.act).padStart(2,"0"):"??",M=y.sequence!==void 0?String(y.sequence).padStart(2,"0"):"??";x.createSpan({cls:"scene-id",text:`[${v}-${M}]`}),x.createSpan({cls:"scene-title",text:` ${y.title}`}),m&&x.createSpan({cls:"character-pov-badge",text:"POV"});let b=z[y.status||"idea"],A=x.createSpan({cls:"scene-status-badge",attr:{title:b.label}});G.setIcon(A,b.icon),x.addEventListener("click",()=>this.openScene(y))}}let g=l.sort((h,y)=>{var x,m;return((x=h.sequence)!=null?x:0)-((m=y.sequence)!=null?m:0)}).filter(h=>h.intensity!==void 0&&h.intensity!==null);g.length>=2&&this.renderIntensityCurve(e,a,g),this.renderGapDetection(e,a,r,l)}renderStat(e,a,r){let s=e.createDiv("character-stat-item");s.createDiv({cls:"character-stat-value",text:a}),s.createDiv({cls:"character-stat-label",text:r})}scheduleSave(e){this.autoSaveTimer&&clearTimeout(this.autoSaveTimer),this.pendingSaveDraft=e,this.autoSaveTimer=setTimeout(async()=>{var a;try{let r=(a=this.plugin.sceneManager)==null?void 0:a.undoManager;r&&this.undoSnapshot&&(r.recordUpdate(e.filePath,this.undoSnapshot,e,`Update character "${e.name}"`,"character"),this.undoSnapshot={...e,custom:{...e.custom||{}}}),this._lastSaveTime=Date.now(),await this.characterManager.saveCharacter(e),this.pendingSaveDraft=null}catch(r){console.error("StoryLine: failed to save character",r)}},600)}async flushPendingSave(){if(this.autoSaveTimer&&(clearTimeout(this.autoSaveTimer),this.autoSaveTimer=null),this.pendingSaveDraft){try{this._lastSaveTime=Date.now(),await this.characterManager.saveCharacter(this.pendingSaveDraft)}catch(e){console.error("StoryLine: failed to flush character save on close",e)}this.pendingSaveDraft=null}}promptNewCharacter(){let e=new j.Modal(this.app);e.titleEl.setText("New Character");let a="";new j.Setting(e.contentEl).setName("Character name").addText(r=>{r.setPlaceholder("Enter character name\u2026").onChange(s=>a=s),setTimeout(()=>r.inputEl.focus(),50)}),new j.Setting(e.contentEl).addButton(r=>{r.setButtonText("Create").setCta().onClick(async()=>{if(!a.trim()){new j.Notice("Please enter a name.");return}try{let s=await this.characterManager.createCharacter(this.sceneManager.getCharacterFolder(),a.trim());this.selectedCharacter=s.filePath,e.close(),this.renderView(this.rootContainer),new j.Notice(`Character "${a.trim()}" created`)}catch(s){new j.Notice(String(s))}})}),e.open()}async createCharacterFromName(e){try{let a=await this.characterManager.createCharacter(this.sceneManager.getCharacterFolder(),e);this.selectedCharacter=a.filePath,this.renderView(this.rootContainer),new j.Notice(`Character profile created for "${e}"`)}catch(a){new j.Notice(String(a))}}confirmDeleteCharacter(e){let a=new j.Modal(this.app);a.titleEl.setText("Delete Character"),a.contentEl.createEl("p",{text:`Are you sure you want to delete "${e.name}"? The file will be moved to trash.`}),new j.Setting(a.contentEl).addButton(r=>{r.setButtonText("Delete").setWarning().onClick(async()=>{var n;let s=(n=this.plugin.sceneManager)==null?void 0:n.undoManager;if(s){let i=this.app.vault.getAbstractFileByPath(e.filePath);if(i instanceof j.TFile){let l=await this.app.vault.read(i);s.recordDelete(e.filePath,l,`Delete character "${e.name}"`,"character")}}await this.characterManager.deleteCharacter(e.filePath),this.selectedCharacter=null,a.close(),this.renderView(this.rootContainer),new j.Notice(`"${e.name}" deleted`)})}).addButton(r=>{r.setButtonText("Cancel").onClick(()=>a.close())}),a.open()}async openCharacterFile(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof j.TFile&&await this.app.workspace.getLeaf("tab").openFile(a)}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof j.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new j.Notice(`Could not find file: ${e.filePath}`)}renderGapDetection(e,a,r,s){var x,m,v,M;if(s.length<2||r.length<3)return;let n=[...r].sort((b,A)=>{var S,L;return((S=b.sequence)!=null?S:0)-((L=A.sequence)!=null?L:0)}),i=[...s].sort((b,A)=>{var S,L;return((S=b.sequence)!=null?S:0)-((L=A.sequence)!=null?L:0)}),l=3,d=[];for(let b=0;b<i.length-1;b++){let A=(x=i[b].sequence)!=null?x:0,S=(m=i[b+1].sequence)!=null?m:0,L=n.filter(C=>{var w,k;return((w=C.sequence)!=null?w:0)>A&&((k=C.sequence)!=null?k:0)<S});L.length>=l&&d.push({from:i[b],to:i[b+1],missedCount:L.length})}let c=(v=i[0].sequence)!=null?v:0,p=(M=i[i.length-1].sequence)!=null?M:0,f=n.filter(b=>{var A;return((A=b.sequence)!=null?A:0)<c}).length,g=n.filter(b=>{var A;return((A=b.sequence)!=null?A:0)>p}).length,u=e.createDiv("character-gaps-section");if(u.createEl("h4",{text:"Presence Gaps"}),d.length===0&&f<l&&g<l){let b=u.createDiv("character-gap-ok"),A=b.createSpan();G.setIcon(A,"check-circle"),b.createSpan({text:` ${a} appears regularly throughout the story`});return}let h=u.createDiv("character-presence-bar"),y=a.toLowerCase();if(n.forEach(b=>{var L,C,w;let A=h.createDiv("character-presence-cell"),S=((L=b.pov)==null?void 0:L.toLowerCase())===y||((C=b.characters)==null?void 0:C.some(k=>k.toLowerCase()===y));A.addClass(S?"presence-active":"presence-absent"),A.setAttribute("title",`${b.title} (seq ${(w=b.sequence)!=null?w:"?"}) \u2014 ${S?"Present":"Absent"}`)}),u.createDiv({cls:"character-presence-legend",text:"Each cell = one scene. Colored = present, dim = absent."}),f>=l){let b=u.createDiv("character-gap-item"),A=b.createSpan();G.setIcon(A,"alert-triangle"),b.createSpan({text:` Absent for first ${f} scenes (appears first in scene ${c})`})}if(d.forEach(b=>{let A=u.createDiv("character-gap-item"),S=A.createSpan();G.setIcon(S,"alert-triangle"),A.createSpan({text:` Gone for ${b.missedCount} scenes between "${b.from.title}" and "${b.to.title}"`})}),g>=l){let b=u.createDiv("character-gap-item"),A=b.createSpan();G.setIcon(A,"alert-triangle"),b.createSpan({text:` Absent for last ${g} scenes (last appears at scene ${p})`})}}renderIntensityCurve(e,a,r){let s=e.createDiv("character-arc-section");s.createEl("h4",{text:"Character Arc (Intensity)"});let n=400,i=120,l=36,d=16,c=n-l*2,p=i-d*2,f=-10,g=10,u=g-f,h=document.createElementNS("http://www.w3.org/2000/svg","svg");h.setAttribute("viewBox",`0 0 ${n} ${i}`),h.setAttribute("width","100%"),h.setAttribute("height",String(i)),h.classList.add("character-arc-svg");for(let v=f;v<=g;v+=5){let M=d+p-(v-f)/u*p,b=document.createElementNS("http://www.w3.org/2000/svg","line");b.setAttribute("x1",String(l)),b.setAttribute("x2",String(l+c)),b.setAttribute("y1",String(M)),b.setAttribute("y2",String(M)),b.setAttribute("class","arc-grid-line"),h.appendChild(b)}let y=document.createElementNS("http://www.w3.org/2000/svg","text");y.setAttribute("x",String(l-6)),y.setAttribute("y",String(d+p)),y.setAttribute("text-anchor","end"),y.setAttribute("class","arc-axis-label"),y.textContent=String(f),h.appendChild(y);let x=document.createElementNS("http://www.w3.org/2000/svg","text");x.setAttribute("x",String(l-6)),x.setAttribute("y",String(d+4)),x.setAttribute("text-anchor","end"),x.setAttribute("class","arc-axis-label"),x.textContent=String(g),h.appendChild(x);let m=[];if(r.forEach((v,M)=>{let b=l+M/(r.length-1)*c,A=typeof v.intensity=="number"?Math.max(f,Math.min(g,v.intensity)):0,S=d+p-(A-f)/u*p;m.push({x:b,y:S,scene:v})}),m.length>=2){let v=m.map((S,L)=>`${L===0?"M":"L"} ${S.x} ${S.y}`).join(" "),M=document.createElementNS("http://www.w3.org/2000/svg","path");M.setAttribute("d",v),M.setAttribute("class","arc-line"),h.appendChild(M);let b=v+` L ${m[m.length-1].x} ${d+p} L ${m[0].x} ${d+p} Z`,A=document.createElementNS("http://www.w3.org/2000/svg","path");A.setAttribute("d",b),A.setAttribute("class","arc-area"),h.appendChild(A)}m.forEach(v=>{var S;let M=document.createElementNS("http://www.w3.org/2000/svg","circle");M.setAttribute("cx",String(v.x)),M.setAttribute("cy",String(v.y)),M.setAttribute("r","4"),M.setAttribute("class","arc-dot");let b=document.createElementNS("http://www.w3.org/2000/svg","title");b.textContent=`${v.scene.title} \u2014 intensity: ${v.scene.intensity}`,M.appendChild(b),h.appendChild(M);let A=document.createElementNS("http://www.w3.org/2000/svg","text");A.setAttribute("x",String(v.x)),A.setAttribute("y",String(d+p+14)),A.setAttribute("text-anchor","middle"),A.setAttribute("class","arc-scene-label"),A.textContent=String((S=v.scene.sequence)!=null?S:"?"),h.appendChild(A)}),s.appendChild(h)}roleClass(e){return`role-${e.toLowerCase().replace(/\s+/g,"-")}`}async refresh(){if(this.selectedCharacter&&Date.now()-this._lastSaveTime<q6.SAVE_REFRESH_GRACE_MS){await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());return}await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder()),this.rootContainer&&this.renderView(this.rootContainer)}addTagContextMenu(e,a){e.addEventListener("contextmenu",r=>{r.preventDefault(),r.stopPropagation();let s=a.toLowerCase(),n=this.plugin.settings.tagTypeOverrides[s],i=[{label:"Prop",value:"prop",icon:"gem"},{label:"Location",value:"location",icon:"map-pin"},{label:"Character",value:"character",icon:"user"},{label:"Other",value:"other",icon:"file-text"},{label:"Reset to Auto",value:null,icon:"rotate-ccw"}],l=new G.Menu;l.addItem(d=>d.setTitle(`#${a}`).setDisabled(!0)),l.addSeparator();for(let d of i)l.addItem(c=>{c.setTitle(d.label).setIcon(d.icon).setChecked(d.value!==null&&n===d.value).onClick(async()=>{d.value===null?delete this.plugin.settings.tagTypeOverrides[s]:this.plugin.settings.tagTypeOverrides[s]=d.value,await this.plugin.saveSettings(),this.rootContainer&&this.renderView(this.rootContainer)})});l.showAtMouseEvent(r)})}};q6.SAVE_REFRESH_GRACE_MS=2e3;var N6=q6;var w8=require("obsidian");var d8=new Set(["dream","mythic"]),A8=new Set(["timeskip","dream","mythic"]),W6=class{static validate(o){if(o.length===0)return[];let e=[];return this.checkTimeline(o,e),this.checkCharacters(o,e),this.checkPlotlines(o,e),this.checkSetupPayoff(o,e),this.checkStructure(o,e),this.checkContinuity(o,e),e}static checkTimeline(o,e){var i,l;let a=[...o].sort((d,c)=>{var p,f;return((p=d.sequence)!=null?p:0)-((f=c.sequence)!=null?f:0)}),r=new Map;for(let d of a)if(d.sequence!==void 0){let c=r.get(d.sequence)||[];c.push(d),r.set(d.sequence,c)}for(let[d,c]of r)c.length>1&&e.push({severity:"warning",category:"Timeline",message:`Duplicate sequence #${d}: ${c.map(p=>`"${p.title}"`).join(", ")}`,scenePaths:c.map(p=>p.filePath)});for(let d=1;d<a.length;d++){let c=a[d-1],p=a[d],f=(i=c.sequence)!=null?i:0,g=(l=p.sequence)!=null?l:0;if(g-f>5){if(A8.has(c.timeline_mode)||A8.has(p.timeline_mode))continue;e.push({severity:"info",category:"Timeline",message:`Large sequence gap: #${f} \u2192 #${g} (gap of ${g-f-1})`,scenePaths:[c.filePath,p.filePath]})}}let s=a.filter(d=>{let c=d.timeline_mode||"linear";return c==="linear"||c==="timeskip"||c==="simultaneous"});this.checkDateOrderForGroup(s,"main timeline",e);let n=new Map;for(let d of a)if((d.timeline_mode==="parallel"||d.timeline_mode==="frame")&&d.timeline_strand){let c=d.timeline_strand,p=n.get(c)||[];p.push(d),n.set(c,p)}for(let[d,c]of n)this.checkDateOrderForGroup(c,`strand "${d}"`,e)}static checkDateOrderForGroup(o,e,a){let r=o.filter(s=>s.storyDate);for(let s=1;s<r.length;s++){let n=r[s-1],i=r[s],l=n.storyDate,d=i.storyDate;if(d<l){if(i.timeline_mode==="simultaneous"||n.timeline_mode==="simultaneous")continue;a.push({severity:"warning",category:"Timeline",message:`Date out of order in ${e}: "${i.title}" (${d}) comes after "${n.title}" (${l}) but has an earlier date`,scenePaths:[n.filePath,i.filePath]})}}}static checkCharacters(o,e){var i,l,d,c,p,f,g;let a=o.filter(u=>!u.pov);a.length>0&&a.length<o.length&&e.push({severity:"info",category:"Characters",message:`${a.length} scene(s) have no POV character assigned`,scenePaths:a.map(u=>u.filePath)});let r=[...o].sort((u,h)=>{var y,x;return((y=u.sequence)!=null?y:0)-((x=h.sequence)!=null?x:0)}),s=new Map;for(let u of r){let h=new Set;u.pov&&h.add(u.pov.toLowerCase()),(i=u.characters)==null||i.forEach(y=>h.add(y.toLowerCase()));for(let y of h){let x=s.get(y)||[];x.push(u),s.set(y,x)}}if(o.length>=5)for(let[u,h]of s)h.length===1&&e.push({severity:"info",category:"Characters",message:`Character "${((l=h[0].pov)==null?void 0:l.toLowerCase())===u?h[0].pov:((d=h[0].characters)==null?void 0:d.find(y=>y.toLowerCase()===u))||u}" appears in only 1 scene ("${h[0].title}")`,scenePaths:[h[0].filePath]});let n=Math.max(5,Math.floor(o.length*.4));for(let[u,h]of s){if(h.length<2)continue;let y=((c=h[0].pov)==null?void 0:c.toLowerCase())===u?h[0].pov:((p=h[0].characters)==null?void 0:p.find(x=>x.toLowerCase()===u))||u;for(let x=1;x<h.length;x++){let m=(f=h[x-1].sequence)!=null?f:0,v=(g=h[x].sequence)!=null?g:0,M=r.filter(b=>{var A,S;return((A=b.sequence)!=null?A:0)>m&&((S=b.sequence)!=null?S:0)<v}).length;M>=n&&e.push({severity:"warning",category:"Characters",message:`"${y}" disappears for ${M} scenes (between "${h[x-1].title}" and "${h[x].title}")`,scenePaths:[h[x-1].filePath,h[x].filePath]})}}}static checkPlotlines(o,e){var l;let a=[...o].sort((d,c)=>{var p,f;return((p=d.sequence)!=null?p:0)-((f=c.sequence)!=null?f:0)}),r=new Map;for(let d of a)(l=d.tags)==null||l.forEach(c=>{let p=r.get(c)||[];p.push(d),r.set(c,p)});let s=new Set;o.forEach(d=>{d.act!==void 0&&s.add(Number(d.act))});let n=Array.from(s).sort((d,c)=>d-c);if(n.length>=2)for(let[d,c]of r){if(c.length<2)continue;let p=new Set(c.map(u=>Number(u.act))),f=Math.min(...Array.from(p)),g=Math.max(...Array.from(p));for(let u of n)u>f&&u<g&&!p.has(u)&&e.push({severity:"warning",category:"Plotlines",message:`Plotline "${d}" has no scenes in Act ${u} (present in Acts ${f}\u2013${g})`});g<n[n.length-1]&&c.length>=3&&e.push({severity:"info",category:"Plotlines",message:`Plotline "${d}" was last seen in Act ${g} but story continues to Act ${n[n.length-1]}`})}let i=o.filter(d=>!d.tags||d.tags.length===0);i.length>0&&i.length<o.length&&e.push({severity:"info",category:"Plotlines",message:`${i.length} scene(s) have no plotline tags`,scenePaths:i.map(d=>d.filePath)})}static checkSetupPayoff(o,e){var r,s,n,i;let a=new Map;o.forEach(l=>a.set(l.title,l));for(let l of o){if((r=l.payoff_scenes)!=null&&r.length)for(let d of l.payoff_scenes)a.has(d)||e.push({severity:"error",category:"Setup/Payoff",message:`"${l.title}" sets up "${d}" but that scene doesn't exist`,scenePaths:[l.filePath]});if((s=l.setup_scenes)!=null&&s.length)for(let d of l.setup_scenes)a.has(d)||e.push({severity:"error",category:"Setup/Payoff",message:`"${l.title}" references setup scene "${d}" but that scene doesn't exist`,scenePaths:[l.filePath]});if((n=l.payoff_scenes)!=null&&n.length)for(let d of l.payoff_scenes){let c=a.get(d);c&&(!c.setup_scenes||!c.setup_scenes.includes(l.title))&&e.push({severity:"warning",category:"Setup/Payoff",message:`"${l.title}" \u2192 "${d}": reverse link missing (target doesn't list this scene as setup)`,scenePaths:[l.filePath,c.filePath]})}if((i=l.payoff_scenes)!=null&&i.length&&l.sequence!==void 0)for(let d of l.payoff_scenes){let c=a.get(d);c&&c.sequence!==void 0&&c.sequence<l.sequence&&e.push({severity:"warning",category:"Setup/Payoff",message:`Setup "${l.title}" (seq ${l.sequence}) comes AFTER its payoff "${d}" (seq ${c.sequence})`,scenePaths:[l.filePath,c.filePath]})}}}static checkStructure(o,e){let a=o.filter(i=>!i.title||i.title==="Untitled Scene"||i.title==="Untitled");a.length>0&&e.push({severity:"info",category:"Structure",message:`${a.length} scene(s) have no title`,scenePaths:a.map(i=>i.filePath)});let r=o.filter(i=>i.act===void 0);r.length>0&&r.length<o.length&&e.push({severity:"warning",category:"Structure",message:`${r.length} scene(s) have no act assigned`,scenePaths:r.map(i=>i.filePath)});let s=new Map;if(o.forEach(i=>{if(i.act!==void 0){let l=Number(i.act);s.set(l,(s.get(l)||0)+1)}}),s.size>=2){let i=Array.from(s.values()),l=Math.max(...i),d=Math.min(...i);if(d>0&&l/d>=3){let c=Array.from(s.entries()).find(([,f])=>f===l)[0],p=Array.from(s.entries()).find(([,f])=>f===d)[0];e.push({severity:"info",category:"Structure",message:`Act imbalance: Act ${c} has ${l} scenes vs Act ${p} with ${d} scenes (${(l/d).toFixed(1)}\xD7 ratio)`})}}let n=o.filter(i=>!i.conflict);if(n.length>0&&n.length<o.length){let i=Math.round(n.length/o.length*100);i>=30&&e.push({severity:"info",category:"Structure",message:`${n.length} scene(s) (${i}%) have no conflict defined`,scenePaths:n.map(l=>l.filePath)})}}static checkContinuity(o,e){var n;let a=[...o].sort((i,l)=>{var d,c;return((d=i.sequence)!=null?d:0)-((c=l.sequence)!=null?c:0)});for(let i=1;i<a.length;i++){let l=a[i-1],d=a[i];if(!(d8.has(l.timeline_mode)||d8.has(d.timeline_mode))&&l.intensity!==void 0&&d.intensity!==void 0){let c=l.intensity-d.intensity;c>=6&&e.push({severity:"info",category:"Pacing",message:`Sharp intensity drop: "${l.title}" (${l.intensity}) \u2192 "${d.title}" (${d.intensity}), a drop of ${c} points`,scenePaths:[l.filePath,d.filePath]})}}let r=null,s=0;for(let i=0;i<a.length;i++){if(d8.has(a[i].timeline_mode)){r=null,s=i+1;continue}let l=(n=a[i].emotion)==null?void 0:n.toLowerCase();l&&l===r?i-s+1===5&&e.push({severity:"info",category:"Pacing",message:`5+ consecutive scenes with emotion "${l}" starting at "${a[s].title}" \u2014 consider varying the tone`,scenePaths:a.slice(s,i+1).map(c=>c.filePath)}):(r=l||null,s=i)}}};var kt=lt(require("obsidian"));var Z6=class extends w8.ItemView{constructor(e,a,r){super(e);this.rootContainer=null;this.plugin=a,this.sceneManager=r}getViewType(){return yt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"bar-chart-2"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-stats-container"),this.rootContainer=e,await this.sceneManager.initialize(),this.renderView(e)}async onClose(){}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");a.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(a,yt,this.plugin,this.leaf);let s=e.createDiv("story-line-stats-content"),n=this.sceneManager.getStatistics(),i=s.createDiv("stats-section");i.createEl("h4",{text:"Overview"}),i.createEl("p",{cls:"stats-big-number",text:`Total Scenes: ${n.totalScenes}`}),this.renderWritingSprint(s,n.totalWords);let l=s.createDiv("stats-section");l.createEl("h4",{text:"Status Breakdown"});let d=l.createEl("ul",{cls:"stats-list"});["idea","outlined","draft","written","revised","final"].forEach(w=>{let k=n.statusCounts[w]||0,T=n.totalScenes>0?Math.round(k/n.totalScenes*100):0,H=z[w],V=d.createEl("li"),R=V.createSpan({cls:"stats-status-entry"}),P=R.createSpan({cls:"stats-status-icon"});kt.setIcon(P,H.icon),R.createSpan({text:` ${H.label}: ${k} (${T}%)`});let I=V.createDiv("stats-bar").createDiv("stats-bar-fill");I.style.width=`${T}%`,I.style.backgroundColor=H.color});let p=s.createDiv("stats-section");p.createEl("h4",{text:"Word Count"});let f=n.totalTargetWords||8e4,g=Math.round(n.totalWords/f*100);p.createEl("p",{text:`${n.totalWords.toLocaleString()} / ~${f.toLocaleString()} (${g}%)`});let h=p.createDiv("stats-bar stats-bar-wide").createDiv("stats-bar-fill");h.style.width=`${Math.min(100,g)}%`,h.style.backgroundColor="var(--sl-success, #4CAF50)";let y=s.createDiv("stats-section");y.createEl("h4",{text:"Act Balance"}),Object.entries(n.actCounts).sort(([w],[k])=>w.localeCompare(k)).forEach(([w,k])=>{let T=n.totalScenes>0?Math.round(k/n.totalScenes*100):0,H=y.createDiv("stats-row");H.createSpan({text:`${w}: ${k} scenes`});let R=H.createDiv("stats-bar").createDiv("stats-bar-fill");R.style.width=`${T}%`,H.createSpan({cls:"stats-percent",text:`${T}%`})}),this.renderPacingAnalysis(s);let m=s.createDiv("stats-section");m.createEl("h4",{text:"POV Distribution"}),Object.entries(n.povCounts).sort(([,w],[,k])=>k-w).forEach(([w,k])=>{let T=n.totalScenes>0?Math.round(k/n.totalScenes*100):0,H=m.createDiv("stats-row");H.createSpan({text:`${w}: ${k} scenes (${T}%)`});let V=H.createDiv("stats-bar"),R=H.createDiv("stats-bar-fill");R.style.width=`${T}%`});let M=s.createDiv("stats-section");M.createEl("h4",{text:"Top Locations"});let b=Object.entries(n.locationCounts).sort(([,w],[,k])=>k-w).slice(0,10);if(b.length>0){let w=M.createEl("ul",{cls:"stats-list"});b.forEach(([k,T])=>{w.createEl("li",{text:`${k}: ${T} scenes`})})}else M.createEl("p",{text:"No location data"});let A=s.createDiv("stats-section");A.createEl("h4",{text:"Warnings & Plot Hole Detection"});let S=this.sceneManager.getAllScenes();if(this.plugin.settings.enablePlotHoleDetection&&S.length>0){let w=W6.validate(S);if(w.length===0){let k=A.createDiv("stats-ok"),T=k.createSpan();kt.setIcon(T,"check-circle"),k.createSpan({text:" No issues detected"})}else{let k=new Map;for(let P of w){let F=k.get(P.category)||[];F.push(P),k.set(P.category,F)}let T=w.filter(P=>P.severity==="error").length,H=w.filter(P=>P.severity==="warning").length,V=w.filter(P=>P.severity==="info").length,R=A.createDiv("stats-warning-summary");T>0&&R.createSpan({cls:"stats-severity-error",text:`${T} error${T>1?"s":""}`}),H>0&&R.createSpan({cls:"stats-severity-warning",text:`${H} warning${H>1?"s":""}`}),V>0&&R.createSpan({cls:"stats-severity-info",text:`${V} info`});for(let[P,F]of k){let I=A.createDiv("stats-warning-category");I.createEl("h5",{text:P});let et=I.createEl("ul",{cls:"stats-list stats-warning-list"});for(let D of F){let K=et.createEl("li",{cls:`stats-severity-${D.severity}`}),st=K.createSpan({cls:"stats-warning-icon"});switch(D.severity){case"error":kt.setIcon(st,"x-circle");break;case"warning":kt.setIcon(st,"alert-triangle");break;case"info":kt.setIcon(st,"info");break}K.createSpan({text:` ${D.message}`})}}}}else S.length===0?A.createEl("p",{text:"No scenes to analyze."}):A.createEl("p",{cls:"stats-ok",text:"Plot hole detection is disabled. Enable it in Settings \u2192 Advanced."});let C=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"}).filter(w=>w.intensity!==void 0);C.length>2&&this.renderTensionCurve(s,C)}renderPacingAnalysis(e){let a=this.sceneManager.getAllScenes();if(a.length===0)return;let r=e.createDiv("stats-section");r.createEl("h4",{text:"Pacing Analysis"});let s={};for(let x of a){let m=x.act!==void 0?`Act ${x.act}`:"No Act";s[m]||(s[m]={total:0,count:0}),s[m].total+=x.wordcount||0,s[m].count+=1}let n=Object.entries(s).sort(([x],[m])=>x.localeCompare(m)),i=Math.max(...n.map(([,x])=>x.count>0?x.total/x.count:0),1),l=r.createDiv("pacing-avg-table");for(let[x,m]of n){let v=m.count>0?Math.round(m.total/m.count):0,M=v/i*100,b=l.createDiv("pacing-avg-row");b.createSpan({cls:"pacing-avg-label",text:x}),b.createSpan({cls:"pacing-avg-value",text:`${v.toLocaleString()} avg words (${m.count} scene${m.count!==1?"s":""})`});let S=b.createDiv("stats-bar").createDiv("stats-bar-fill");S.style.width=`${M}%`,S.style.backgroundColor="var(--sl-info, #2196F3)"}let d=e.createDiv("stats-section");d.createEl("h4",{text:"Word Count Distribution"});let c=a.map(x=>x.wordcount||0),p=Math.max(...c,1),f;p<=500?f=100:p<=2e3?f=250:p<=5e3?f=500:f=1e3;let g=[],u=Math.ceil(p/f)||1;for(let x=0;x<u;x++){let m=x*f,v=m+f,M=c.filter(b=>b>=m&&b<v).length;g.push({label:`${m}\u2013${v}`,count:M})}let h=Math.max(...g.map(x=>x.count),1),y=d.createDiv("pacing-dist-chart");for(let x of g){let m=y.createDiv("pacing-dist-col"),v=x.count/h*100,M=m.createDiv("pacing-dist-bar");M.style.height=`${Math.max(2,v)}%`,M.setAttribute("title",`${x.label} words: ${x.count} scene${x.count!==1?"s":""}`);let b=m.createDiv("pacing-dist-count");b.textContent=String(x.count);let A=m.createDiv("pacing-dist-label");A.textContent=x.label}}renderWritingSprint(e,a){let r=this.plugin.writingTracker,s=e.createDiv("stats-section");s.createEl("h4",{text:"Writing Sprint"});let n=r.getSessionWords(a),i=r.getWordsPerMinute(a),l=r.getSessionDuration(),d=Math.floor(l/6e4),c=this.plugin.settings.dailyWordGoal||1e3,p=r.getTodayWords()+n,f=r.getStreak(),g=s.createDiv("stats-sprint-row");this.createStatCard(g,"pencil","Session",`${n.toLocaleString()} words`),this.createStatCard(g,"clock","Duration",`${d} min`),this.createStatCard(g,"zap","Speed",`${i} wpm`),f>0&&this.createStatCard(g,"flame","Streak",`${f} day${f>1?"s":""}`);let u=Math.min(100,Math.round(p/c*100)),h=s.createDiv("stats-sprint-goal");h.createSpan({text:`Today: ${p.toLocaleString()} / ${c.toLocaleString()} words (${u}%)`});let x=h.createDiv("stats-bar stats-bar-wide").createDiv("stats-bar-fill");x.style.width=`${u}%`,x.style.backgroundColor=u>=100?"var(--sl-success, #4CAF50)":"var(--sl-info, #2196F3)";let m=r.getRecentDays(7).reverse(),v=Math.max(...m.map(A=>A.words),1),M=s.createDiv("stats-sprint-sparkline");M.createSpan({cls:"stats-sprint-sparkline-label",text:"Last 7 days:"});let b=M.createDiv("stats-sprint-spark-row");for(let A of m){let S=b.createDiv("stats-sprint-spark-col"),L=A.words/v*100,C=S.createDiv("stats-sprint-spark-bar");C.style.height=`${Math.max(2,L)}%`,C.setAttribute("title",`${A.date}: ${A.words} words`);let w=S.createDiv("stats-sprint-spark-label");w.textContent=A.date.slice(5)}}createStatCard(e,a,r,s){let n=e.createDiv("stats-sprint-card"),i=n.createSpan({cls:"stats-sprint-card-icon"});kt.setIcon(i,a),n.createDiv({cls:"stats-sprint-card-value",text:s}),n.createDiv({cls:"stats-sprint-card-label",text:r})}renderTensionCurve(e,a){let r=e.createDiv("stats-section");r.createEl("h4",{text:"Tension Curve"});let s=r.createDiv("tension-chart"),n=10;a.forEach(i=>{let l=s.createDiv("tension-col"),d=i.intensity||0,c=d/n*100,p=l.createDiv("tension-bar");p.style.height=`${c}%`,p.setAttribute("title",`${i.title||"Untitled"}: ${d}/10`),l.createDiv({cls:"tension-label",text:String(d)})})}refresh(){this.rootContainer&&this.renderView(this.rootContainer)}};var N=require("obsidian"),Z=lt(require("obsidian"));var C8=[{title:"Overview",icon:"globe",fields:[{key:"name",label:"Name",placeholder:"Name of the world or setting"},{key:"description",label:"Description",placeholder:"General overview of this world",multiline:!0}]},{title:"Geography",icon:"mountain",fields:[{key:"geography",label:"Geography",placeholder:"Environmental conditions, weather, climate, terrain",multiline:!0}]},{title:"Culture",icon:"landmark",fields:[{key:"culture",label:"Culture",placeholder:"Norms, values, traditions, social structures",multiline:!0}]},{title:"Politics",icon:"crown",fields:[{key:"politics",label:"Politics",placeholder:"Systems of power and control, governance",multiline:!0}]},{title:"Magic / Technology",icon:"wand-2",fields:[{key:"magicTechnology",label:"Magic / Technology",placeholder:"Rules and limitations that govern how things work",multiline:!0}]},{title:"Beliefs",icon:"book-open",fields:[{key:"beliefs",label:"Beliefs",placeholder:"Myths, spiritual, religious, and philosophical beliefs",multiline:!0}]},{title:"Economy",icon:"coins",fields:[{key:"economy",label:"Economy",placeholder:"Trade, currency, resources, wealth distribution",multiline:!0}]},{title:"History",icon:"scroll-text",fields:[{key:"history",label:"History",placeholder:"Key historical events, eras, conflicts",multiline:!0}]}],L8=[{title:"Overview",icon:"map-pin",fields:[{key:"name",label:"Name",placeholder:"Name of this location"},{key:"locationType",label:"Type",placeholder:"City, building, wilderness, room\u2026"},{key:"description",label:"Description",placeholder:"Sights, sounds, smells \u2014 what does it feel like?",multiline:!0}]},{title:"Atmosphere",icon:"cloud",fields:[{key:"atmosphere",label:"Atmosphere / Mood",placeholder:"The feeling this place evokes",multiline:!0}]},{title:"Story Significance",icon:"bookmark",fields:[{key:"significance",label:"Significance",placeholder:"Why this place matters to the story",multiline:!0}]},{title:"People",icon:"users",fields:[{key:"inhabitants",label:"Inhabitants",placeholder:"Key inhabitants or characters often present",multiline:!0}]},{title:"Connections",icon:"link",fields:[{key:"connectedLocations",label:"Connected Locations",placeholder:"Nearby or linked locations"},{key:"mapNotes",label:"Map Notes",placeholder:"Coordinates, spatial relationships, layout notes",multiline:!0}]}],c8=["City","Town","Village","Building","Room","Wilderness","Landmark","Region","Country","Other"],E8=["name","description","geography","culture","politics","magicTechnology","beliefs","economy","history"],k8=["name","locationType","world","parent","description","atmosphere","significance","inhabitants","connectedLocations","mapNotes"];var ot=require("obsidian");var Rt=class{constructor(o){this.worlds=new Map;this.locations=new Map;this.app=o}async loadAll(o){this.worlds.clear(),this.locations.clear(),await this.scanFolderAdapter(o)}async scanFolderAdapter(o){let e=this.app.vault.adapter;if(!await e.exists(o))return;let a=await e.list(o);for(let r of a.files)if(r.endsWith(".md"))try{let s=await e.read(r);this.parseAndStoreContent(s,r)}catch(s){}for(let r of a.folders)await this.scanFolderAdapter(r)}parseAndStoreContent(o,e){var n,i;let a=this.extractFrontmatter(o);if(!a)return;let r=this.extractBody(o),s=(i=(n=e.split("/").pop())==null?void 0:n.replace(/\.md$/i,""))!=null?i:e;if(a.type==="world"){let l={filePath:e,type:"world",name:a.name||s,description:a.description,geography:a.geography,culture:a.culture,politics:a.politics,magicTechnology:a.magicTechnology,beliefs:a.beliefs,economy:a.economy,history:a.history,custom:a.custom&&typeof a.custom=="object"?a.custom:void 0,created:a.created,modified:a.modified,notes:r||void 0};this.worlds.set(e,l)}else if(a.type==="location"){let l={filePath:e,type:"location",name:a.name||s,locationType:a.locationType,world:a.world,parent:a.parent,description:a.description,atmosphere:a.atmosphere,significance:a.significance,inhabitants:a.inhabitants,connectedLocations:a.connectedLocations,mapNotes:a.mapNotes,custom:a.custom&&typeof a.custom=="object"?a.custom:void 0,created:a.created,modified:a.modified,notes:r||void 0};this.locations.set(e,l)}}getAllWorlds(){return Array.from(this.worlds.values()).sort((o,e)=>o.name.toLowerCase().localeCompare(e.name.toLowerCase()))}getAllLocations(){return Array.from(this.locations.values()).sort((o,e)=>o.name.toLowerCase().localeCompare(e.name.toLowerCase()))}getWorld(o){return this.worlds.get(o)}getLocation(o){return this.locations.get(o)}getItem(o){var e;return(e=this.worlds.get(o))!=null?e:this.locations.get(o)}getLocationsForWorld(o){let e=o.toLowerCase();return this.getAllLocations().filter(a=>{var r;return((r=a.world)==null?void 0:r.toLowerCase())===e})}getChildLocations(o){let e=o.toLowerCase();return this.getAllLocations().filter(a=>{var r;return((r=a.parent)==null?void 0:r.toLowerCase())===e})}getOrphanLocations(){return this.getAllLocations().filter(o=>!o.world)}getTopLevelLocations(o){let e=o.toLowerCase();return this.getAllLocations().filter(a=>{var r;return((r=a.world)==null?void 0:r.toLowerCase())===e&&!a.parent})}async createWorld(o,e){await this.ensureFolder(o);let a=e.replace(/[\\/:*?"<>|]/g,"-"),r=(0,ot.normalizePath)(`${o}/${a}.md`);if(this.app.vault.getAbstractFileByPath(r))throw new Error(`World file already exists: ${r}`);let s=new Date().toISOString().split("T")[0],n={type:"world",name:e,created:s,modified:s};await this.app.vault.create(r,`---
${(0,ot.stringifyYaml)(n)}---
`),await this.ensureFolder((0,ot.normalizePath)(`${o}/${a}`));let i={filePath:r,type:"world",name:e,created:s,modified:s};return this.worlds.set(r,i),i}async createLocation(o,e,a,r){let s=o;if(a){let p=a.replace(/[\\/:*?"<>|]/g,"-");s=(0,ot.normalizePath)(`${o}/${p}`)}await this.ensureFolder(s);let n=e.replace(/[\\/:*?"<>|]/g,"-"),i=(0,ot.normalizePath)(`${s}/${n}.md`);if(this.app.vault.getAbstractFileByPath(i))throw new Error(`Location file already exists: ${i}`);let l=new Date().toISOString().split("T")[0],d={type:"location",name:e,created:l,modified:l};a&&(d.world=a),r&&(d.parent=r),await this.app.vault.create(i,`---
${(0,ot.stringifyYaml)(d)}---
`);let c={filePath:i,type:"location",name:e,world:a,parent:r,created:l,modified:l};return this.locations.set(i,c),c}async saveWorld(o){await this.saveItem(o,E8),this.worlds.set(o.filePath,{...o})}async saveLocation(o){await this.saveItem(o,k8),this.locations.set(o.filePath,{...o})}async saveItem(o,e){var c;let a=this.app.vault.getAbstractFileByPath(o.filePath);if(!(a instanceof ot.TFile))throw new Error(`File not found: ${o.filePath}`);let r=await this.app.vault.read(a),s=this.extractFrontmatter(r)||{},n=this.extractBody(r),i={...s};i.type=o.type,i.name=o.name,i.modified=new Date().toISOString().split("T")[0],o.created&&(i.created=o.created);for(let p of e){if(p==="name")continue;let f=o[p];f!=null&&f!==""?i[p]=f:delete i[p]}o.custom&&Object.keys(o.custom).length>0?i.custom=o.custom:delete i.custom;let l=(c=o.notes)!=null?c:n,d=`---
${(0,ot.stringifyYaml)(i)}---
${l?`
`+l:""}`;await this.app.vault.modify(a,d)}async deleteItem(o){let e=this.app.vault.getAbstractFileByPath(o);e instanceof ot.TFile&&await this.app.vault.trash(e,!0),this.worlds.delete(o),this.locations.delete(o)}extractFrontmatter(o){let e=o.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!e)return null;try{return(0,ot.parseYaml)(e[1])}catch(a){return null}}extractBody(o){let e=o.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);return e?e[1].trim():""}async ensureFolder(o){this.app.vault.getAbstractFileByPath(o)||await this.app.vault.createFolder(o)}};var G6=class G6 extends N.ItemView{constructor(e,a,r){super(e);this.selectedItem=null;this.rootContainer=null;this.collapsedSections=new Set;this.collapsedTreeNodes=new Set;this.autoSaveTimer=null;this.pendingSaveDraft=null;this.undoSnapshot=null;this._lastSaveTime=0;this.plugin=a,this.sceneManager=r,this.locationManager=new Rt(this.app)}getViewType(){return bt}getDisplayText(){var a,r,s;let e=(s=(r=(a=this.plugin)==null?void 0:a.sceneManager)==null?void 0:r.activeProject)==null?void 0:s.title;return e?`StoryLine - ${e}`:"StoryLine"}getIcon(){return"map-pin"}async onOpen(){this.plugin.storyLeaf=this.leaf;let e=this.containerEl.children[1];e.empty(),e.addClass("story-line-location-container"),this.rootContainer=e,await this.sceneManager.initialize(),await this.locationManager.loadAll(this.sceneManager.getLocationFolder()),this.renderView(e)}async onClose(){await this.flushPendingSave()}renderView(e){e.empty();let a=e.createDiv("story-line-toolbar");a.createDiv("story-line-title-row").createEl("h3",{cls:"story-line-view-title",text:"StoryLine"}),at(a,bt,this.plugin,this.leaf);let s=a.createDiv("story-line-toolbar-controls");s.createEl("button",{cls:"mod-cta location-add-btn",text:"+ World"}).addEventListener("click",()=>this.promptNewWorld()),s.createEl("button",{cls:"location-add-btn",text:"+ Location"}).addEventListener("click",()=>this.promptNewLocation());let l=e.createDiv("story-line-location-content");this.selectedItem?this.renderDetail(l):this.renderOverview(l)}renderOverview(e){e.empty(),e.createEl("h3",{text:"Worlds & Locations"});let a=this.locationManager.getAllWorlds(),r=this.locationManager.getOrphanLocations(),s=this.sceneManager.getAllScenes();if(a.length===0&&r.length===0){let c=e.createDiv("location-empty-state"),p=c.createDiv("location-empty-icon");Z.setIcon(p,"map"),c.createEl("h4",{text:"No worlds or locations yet"}),c.createEl("p",{text:'Click "+ World" to create a worldbuilding profile, or "+ Location" to add a specific place.'});return}let n=e.createDiv("location-tree");for(let c of a)this.renderWorldNode(n,c,s);if(r.length>0){a.length>0&&n.createDiv("location-orphan-divider").createEl("span",{text:"Standalone Locations"});for(let c of r)this.renderLocationNode(n,c,s,0)}let i=[...this.locationManager.getAllLocations().map(c=>c.name.toLowerCase()),...a.map(c=>c.name.toLowerCase())],d=this.sceneManager.getUniqueValues("location").filter(c=>!i.includes(c.toLowerCase()));if(d.length>0){n.createDiv("location-orphan-divider").createEl("span",{text:"Locations from scenes (no profile yet)"});for(let p of d)this.renderUnlinkedLocation(n,p,s)}}renderWorldNode(e,a,r){let s=e.createDiv("location-tree-node location-world-node"),n=this.collapsedTreeNodes.has(a.filePath),i=s.createDiv("location-tree-header"),l=i.createSpan("location-tree-chevron"),d=this.locationManager.getLocationsForWorld(a.name);d.length>0?(Z.setIcon(l,n?"chevron-right":"chevron-down"),l.addEventListener("click",f=>{f.stopPropagation(),this.collapsedTreeNodes.has(a.filePath)?this.collapsedTreeNodes.delete(a.filePath):this.collapsedTreeNodes.add(a.filePath),this.renderView(this.rootContainer)})):l.style.width="14px";let c=i.createSpan("location-tree-icon");Z.setIcon(c,"globe"),i.createSpan({cls:"location-tree-name",text:a.name});let p=i.createSpan({cls:"location-tree-count",text:`${d.length} loc`});if(i.addEventListener("click",()=>{this.selectedItem=a.filePath,this.renderView(this.rootContainer)}),!n&&d.length>0){let f=s.createDiv("location-tree-children"),g=this.locationManager.getTopLevelLocations(a.name);for(let u of g)this.renderLocationNode(f,u,r,1)}}renderLocationNode(e,a,r,s){let n=e.createDiv("location-tree-node"),i=this.locationManager.getChildLocations(a.name),l=this.collapsedTreeNodes.has(a.filePath),d=n.createDiv("location-tree-header");d.style.paddingLeft=`${s*20}px`;let c=d.createSpan("location-tree-chevron");i.length>0?(Z.setIcon(c,l?"chevron-right":"chevron-down"),c.addEventListener("click",u=>{u.stopPropagation(),this.collapsedTreeNodes.has(a.filePath)?this.collapsedTreeNodes.delete(a.filePath):this.collapsedTreeNodes.add(a.filePath),this.renderView(this.rootContainer)})):c.style.width="14px";let p=d.createSpan("location-tree-icon");Z.setIcon(p,"map-pin"),d.createSpan({cls:"location-tree-name",text:a.name});let f=a.name.toLowerCase(),g=r.filter(u=>{var h;return((h=u.location)==null?void 0:h.toLowerCase())===f}).length;if(g>0&&d.createSpan({cls:"location-tree-count",text:`${g} sc`}),a.locationType&&d.createSpan({cls:"location-type-badge",text:a.locationType}),d.addEventListener("click",()=>{this.selectedItem=a.filePath,this.renderView(this.rootContainer)}),!l&&i.length>0){let u=n.createDiv("location-tree-children");for(let h of i)this.renderLocationNode(u,h,r,s+1)}}renderUnlinkedLocation(e,a,r){let n=e.createDiv("location-tree-node location-unlinked-node").createDiv("location-tree-header");n.createSpan({cls:"location-tree-chevron"}).style.width="14px";let i=n.createSpan("location-tree-icon");Z.setIcon(i,"map-pin"),n.createSpan({cls:"location-tree-name",text:a});let l=a.toLowerCase(),d=r.filter(p=>{var f;return((f=p.location)==null?void 0:f.toLowerCase())===l}).length;d>0&&n.createSpan({cls:"location-tree-count",text:`${d} sc`}),n.createEl("button",{cls:"location-create-profile-btn",text:"Create"}).addEventListener("click",async p=>{p.stopPropagation(),await this.createLocationFromName(a)})}renderDetail(e){e.empty();let a=this.locationManager.getItem(this.selectedItem);if(!a){this.selectedItem=null,this.renderOverview(e);return}let r=a.type==="world",s={...a,custom:{...a.custom||{}}};this.undoSnapshot={...a,custom:{...a.custom||{}}};let n=e.createDiv("location-detail-header"),i=n.createEl("button",{cls:"location-back-btn"});Z.setIcon(i,"arrow-left"),i.createSpan({text:" All Locations"}),i.addEventListener("click",()=>{this.selectedItem=null,this.renderView(this.rootContainer)});let l=n.createDiv("location-detail-header-right"),d=l.createEl("button",{cls:"location-delete-btn",attr:{title:"Delete"}});Z.setIcon(d,"trash-2"),d.addEventListener("click",()=>this.confirmDelete(a));let c=l.createEl("button",{cls:"location-open-btn",attr:{title:"Open file"}});Z.setIcon(c,"file-text"),c.addEventListener("click",()=>this.openFile(a));let p=e.createDiv("location-detail-type");Z.setIcon(p,r?"globe":"map-pin"),p.createSpan({text:` ${r?"World":"Location"}`});let f=e.createDiv("location-detail-layout"),g=f.createDiv("location-detail-form"),u=f.createDiv("location-detail-side"),h=r?C8:L8;for(let y of h)this.renderCategory(g,y,s);r||this.renderLocationHierarchy(g,s),this.renderCustomFields(g,s),r?this.renderWorldSidePanel(u,s):this.renderLocationSidePanel(u,s)}renderCategory(e,a,r){let s=e.createDiv("location-section"),n=this.collapsedSections.has(a.title),i=s.createDiv("location-section-header"),l=i.createSpan("location-section-chevron");Z.setIcon(l,n?"chevron-right":"chevron-down");let d=i.createSpan("location-section-icon");Z.setIcon(d,a.icon),i.createSpan({text:a.title});let c=s.createDiv("location-section-body");n&&(c.style.display="none"),i.addEventListener("click",()=>{this.collapsedSections.has(a.title)?(this.collapsedSections.delete(a.title),c.style.display="",Z.setIcon(l,"chevron-down")):(this.collapsedSections.add(a.title),c.style.display="none",Z.setIcon(l,"chevron-right"))});for(let p of a.fields)this.renderField(c,p,r)}renderField(e,a,r){var i;let s=e.createDiv("location-field-row");s.createEl("label",{cls:"location-field-label",text:a.label});let n=(i=r[a.key])!=null?i:"";if(a.key==="locationType"){let l=s.createEl("select",{cls:"location-field-input dropdown"});l.createEl("option",{text:a.placeholder,value:""});for(let d of c8){let c=l.createEl("option",{text:d,value:d.toLowerCase()});String(n).toLowerCase()===d.toLowerCase()&&(c.selected=!0)}if(n&&!c8.map(d=>d.toLowerCase()).includes(String(n).toLowerCase())){let d=l.createEl("option",{text:String(n),value:String(n)});d.selected=!0}l.addEventListener("change",()=>{r[a.key]=l.value,this.scheduleSave(r)})}else if(a.multiline){let l=s.createEl("textarea",{cls:"location-field-textarea",attr:{placeholder:a.placeholder,rows:"3"}});l.value=n,l.addEventListener("input",()=>{r[a.key]=l.value,this.scheduleSave(r)})}else{let l=s.createEl("input",{cls:"location-field-input",type:"text",attr:{placeholder:a.placeholder}});l.value=n,l.addEventListener("input",()=>{r[a.key]=l.value,this.scheduleSave(r)})}}renderLocationHierarchy(e,a){let r=e.createDiv("location-section"),s=r.createDiv("location-section-header"),n=s.createSpan("location-section-chevron");Z.setIcon(n,"chevron-down");let i=s.createSpan("location-section-icon");Z.setIcon(i,"git-branch"),s.createSpan({text:"Hierarchy"});let l=r.createDiv("location-section-body"),d=l.createDiv("location-field-row");d.createEl("label",{cls:"location-field-label",text:"World"});let c=d.createEl("select",{cls:"location-field-input dropdown"});c.createEl("option",{text:"None (standalone)",value:""});for(let u of this.locationManager.getAllWorlds()){let h=c.createEl("option",{text:u.name,value:u.name});a.world===u.name&&(h.selected=!0)}c.addEventListener("change",()=>{a.world=c.value||void 0,this.scheduleSave(a)});let p=l.createDiv("location-field-row");p.createEl("label",{cls:"location-field-label",text:"Parent Location"});let f=p.createEl("select",{cls:"location-field-input dropdown"});f.createEl("option",{text:"None (top-level)",value:""});let g=this.locationManager.getAllLocations().filter(u=>u.filePath!==a.filePath);for(let u of g){let h=f.createEl("option",{text:u.name,value:u.name});a.parent===u.name&&(h.selected=!0)}f.addEventListener("change",()=>{a.parent=f.value||void 0,this.scheduleSave(a)})}renderCustomFields(e,a){let r=e.createDiv("location-section"),s="Custom Fields",n=this.collapsedSections.has(s),i=r.createDiv("location-section-header"),l=i.createSpan("location-section-chevron");Z.setIcon(l,n?"chevron-right":"chevron-down");let d=i.createSpan("location-section-icon");Z.setIcon(d,"plus-circle"),i.createSpan({text:s});let c=r.createDiv("location-section-body");n&&(c.style.display="none"),i.addEventListener("click",()=>{this.collapsedSections.has(s)?(this.collapsedSections.delete(s),c.style.display="",Z.setIcon(l,"chevron-down")):(this.collapsedSections.add(s),c.style.display="none",Z.setIcon(l,"chevron-right"))});let p=()=>{c.empty();let f=a.custom||{};for(let[h,y]of Object.entries(f)){let x=c.createDiv("location-field-row location-custom-row"),m=x.createEl("input",{cls:"location-field-input location-custom-key",type:"text",attr:{placeholder:"Field name"}});m.value=h;let v=x.createEl("input",{cls:"location-field-input location-custom-value",type:"text",attr:{placeholder:"Value"}});v.value=y;let M=x.createEl("button",{cls:"location-custom-remove",attr:{title:"Remove"}});Z.setIcon(M,"x"),m.addEventListener("change",()=>{delete a.custom[h];let b=m.value.trim();b&&(a.custom[b]=v.value),this.scheduleSave(a)}),v.addEventListener("input",()=>{let b=m.value.trim();b&&(a.custom[b]=v.value,this.scheduleSave(a))}),M.addEventListener("click",()=>{delete a.custom[h],x.remove(),this.scheduleSave(a)})}c.createDiv("location-custom-add-row").createEl("button",{cls:"location-custom-add-btn",text:"+ Add Field"}).addEventListener("click",()=>{a.custom||(a.custom={});let h=Object.keys(a.custom).length+1,y=`field_${h}`;for(;a.custom[y];)y=`field_${++h}`;a.custom[y]="",p()})};p()}renderWorldSidePanel(e,a){let r=this.locationManager.getLocationsForWorld(a.name),s=this.sceneManager.getAllScenes(),n=e.createDiv("location-side-stats");n.createEl("h4",{text:"World Summary"});let i=n.createDiv("location-stat-grid");this.renderStat(i,String(r.length),"Locations");let l=new Set(r.map(p=>p.name.toLowerCase())),d=s.filter(p=>p.location&&l.has(p.location.toLowerCase()));if(this.renderStat(i,String(d.length),"Scenes"),r.length>0){let p=e.createDiv("location-side-list");p.createEl("h4",{text:"Locations in this World"});for(let f of r){let g=p.createDiv("location-side-item"),u=g.createSpan("location-side-item-icon");Z.setIcon(u,"map-pin"),g.createSpan({text:f.name}),f.locationType&&g.createSpan({cls:"location-type-badge-sm",text:f.locationType}),g.addEventListener("click",()=>{this.selectedItem=f.filePath,this.renderView(this.rootContainer)})}}e.createEl("button",{cls:"location-add-to-world-btn",text:`+ Add location to ${a.name}`}).addEventListener("click",()=>this.promptNewLocation(a.name))}renderLocationSidePanel(e,a){let r=this.sceneManager.getFilteredScenes(void 0,{field:"sequence",direction:"asc"}),s=a.name.toLowerCase(),n=r.filter(p=>{var f;return((f=p.location)==null?void 0:f.toLowerCase())===s}),i=e.createDiv("location-side-stats");if(i.createEl("h4",{text:"Location Info"}),a.world){let p=i.createDiv("location-side-world-info"),f=p.createSpan();Z.setIcon(f,"globe"),p.createSpan({text:` ${a.world}`})}if(a.parent){let p=i.createDiv("location-side-parent-info"),f=p.createSpan();Z.setIcon(f,"corner-down-right"),p.createSpan({text:` Inside: ${a.parent}`})}let l=i.createDiv("location-stat-grid");this.renderStat(l,String(n.length),"Scenes");let d=this.locationManager.getChildLocations(a.name);if(d.length>0&&this.renderStat(l,String(d.length),"Sub-locations"),n.length>0){let p=e.createDiv("location-side-scenes");p.createEl("h4",{text:"Scenes here"});for(let f of n){let g=p.createDiv("location-side-scene-item"),u=f.act!==void 0?String(f.act).padStart(2,"0"):"??",h=f.sequence!==void 0?String(f.sequence).padStart(2,"0"):"??";g.createSpan({cls:"scene-id",text:`[${u}-${h}]`}),g.createSpan({cls:"scene-title",text:` ${f.title}`});let y=z[f.status||"idea"],x=g.createSpan({cls:"scene-status-badge",attr:{title:y.label}});Z.setIcon(x,y.icon),g.addEventListener("click",()=>this.openScene(f))}}let c=new Map;for(let p of n)if(p.pov&&c.set(p.pov,(c.get(p.pov)||0)+1),p.characters)for(let f of p.characters)f!==p.pov&&c.set(f,(c.get(f)||0)+1);if(c.size>0){let p=e.createDiv("location-side-chars");p.createEl("h4",{text:"Characters here"});let f=Array.from(c.entries()).sort((g,u)=>u[1]-g[1]);for(let[g,u]of f){let h=p.createDiv("location-side-char-item"),y=h.createSpan();Z.setIcon(y,"user"),h.createSpan({text:` ${g}`}),h.createSpan({cls:"location-side-char-count",text:`${u}`})}}}renderStat(e,a,r){let s=e.createDiv("location-stat-item");s.createDiv({cls:"location-stat-value",text:a}),s.createDiv({cls:"location-stat-label",text:r})}scheduleSave(e){this.autoSaveTimer&&clearTimeout(this.autoSaveTimer),this.pendingSaveDraft=e,this.autoSaveTimer=setTimeout(async()=>{var a;try{let r=(a=this.plugin.sceneManager)==null?void 0:a.undoManager;r&&this.undoSnapshot&&(r.recordUpdate(e.filePath,this.undoSnapshot,e,`Update ${e.type} "${e.name}"`,"location"),this.undoSnapshot={...e,custom:{...e.custom||{}}}),this._lastSaveTime=Date.now(),e.type==="world"?await this.locationManager.saveWorld(e):await this.locationManager.saveLocation(e),this.pendingSaveDraft=null}catch(r){console.error("StoryLine: failed to save location/world",r)}},600)}async flushPendingSave(){if(this.autoSaveTimer&&(clearTimeout(this.autoSaveTimer),this.autoSaveTimer=null),this.pendingSaveDraft){try{this._lastSaveTime=Date.now();let e=this.pendingSaveDraft;e.type==="world"?await this.locationManager.saveWorld(e):await this.locationManager.saveLocation(e)}catch(e){console.error("StoryLine: failed to flush location/world save on close",e)}this.pendingSaveDraft=null}}promptNewWorld(){let e=new N.Modal(this.app);e.titleEl.setText("New World");let a="";new N.Setting(e.contentEl).setName("World name").addText(r=>{r.setPlaceholder("Enter world name\u2026").onChange(s=>a=s),setTimeout(()=>r.inputEl.focus(),50)}),new N.Setting(e.contentEl).addButton(r=>{r.setButtonText("Create").setCta().onClick(async()=>{if(!a.trim()){new N.Notice("Please enter a name.");return}try{let s=await this.locationManager.createWorld(this.sceneManager.getLocationFolder(),a.trim());this.selectedItem=s.filePath,e.close(),this.renderView(this.rootContainer),new N.Notice(`World "${a.trim()}" created`)}catch(s){new N.Notice(String(s))}})}),e.open()}promptNewLocation(e){let a=new N.Modal(this.app);a.titleEl.setText("New Location");let r="",s=e||"";new N.Setting(a.contentEl).setName("Location name").addText(i=>{i.setPlaceholder("Enter location name\u2026").onChange(l=>r=l),setTimeout(()=>i.inputEl.focus(),50)});let n=this.locationManager.getAllWorlds();n.length>0&&new N.Setting(a.contentEl).setName("World").setDesc("Which world does this location belong to?").addDropdown(i=>{i.addOption("","None (standalone)");for(let l of n)i.addOption(l.name,l.name);s&&i.setValue(s),i.onChange(l=>s=l)}),new N.Setting(a.contentEl).addButton(i=>{i.setButtonText("Create").setCta().onClick(async()=>{if(!r.trim()){new N.Notice("Please enter a name.");return}try{let l=await this.locationManager.createLocation(this.sceneManager.getLocationFolder(),r.trim(),s||void 0);this.selectedItem=l.filePath,a.close(),this.renderView(this.rootContainer),new N.Notice(`Location "${r.trim()}" created`)}catch(l){new N.Notice(String(l))}})}),a.open()}async createLocationFromName(e){try{let a=await this.locationManager.createLocation(this.sceneManager.getLocationFolder(),e);this.selectedItem=a.filePath,this.renderView(this.rootContainer),new N.Notice(`Location profile created for "${e}"`)}catch(a){new N.Notice(String(a))}}confirmDelete(e){let a=new N.Modal(this.app);a.titleEl.setText(`Delete ${e.type==="world"?"World":"Location"}`),a.contentEl.createEl("p",{text:`Are you sure you want to delete "${e.name}"? The file will be moved to trash.`}),new N.Setting(a.contentEl).addButton(r=>{r.setButtonText("Delete").setWarning().onClick(async()=>{var n;let s=(n=this.plugin.sceneManager)==null?void 0:n.undoManager;if(s){let i=this.app.vault.getAbstractFileByPath(e.filePath);if(i instanceof N.TFile){let l=await this.app.vault.read(i);s.recordDelete(e.filePath,l,`Delete ${e.type} "${e.name}"`,"location")}}await this.locationManager.deleteItem(e.filePath),this.selectedItem=null,a.close(),this.renderView(this.rootContainer),new N.Notice(`"${e.name}" deleted`)})}).addButton(r=>r.setButtonText("Cancel").onClick(()=>a.close())),a.open()}async openFile(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof N.TFile&&await this.app.workspace.getLeaf("tab").openFile(a)}async openScene(e){let a=this.app.vault.getAbstractFileByPath(e.filePath);a instanceof N.TFile?await this.app.workspace.getLeaf("tab").openFile(a):new N.Notice(`Could not find file: ${e.filePath}`)}async refresh(){if(this.selectedItem&&Date.now()-this._lastSaveTime<G6.SAVE_REFRESH_GRACE_MS){await this.locationManager.loadAll(this.sceneManager.getLocationFolder());return}await this.locationManager.loadAll(this.sceneManager.getLocationFolder()),this.rootContainer&&this.renderView(this.rootContainer)}};G6.SAVE_REFRESH_GRACE_MS=2e3;var U6=G6;var _6=class{constructor(){this.baselineWords=0;this.sessionStart=Date.now();this.history={}}startSession(o){this.baselineWords=o,this.sessionStart=Date.now()}getSessionWords(o){return Math.max(0,o-this.baselineWords)}getSessionDuration(){return Date.now()-this.sessionStart}getWordsPerMinute(o){let e=this.getSessionDuration()/6e4;return e<.5?0:Math.round(this.getSessionWords(o)/e)}recordToday(o){let e=this.todayKey();this.history[e]=(this.history[e]||0)+o}flushSession(o){let e=this.getSessionWords(o);e>0&&this.recordToday(e),this.baselineWords=o}getTodayWords(){return this.history[this.todayKey()]||0}getRecentDays(o){let e=[],a=new Date;for(let r=0;r<o;r++){let s=this.dateKey(a);e.push({date:s,words:this.history[s]||0}),a.setDate(a.getDate()-1)}return e}getStreak(){let o=0,e=new Date;for(this.history[this.dateKey(e)]||e.setDate(e.getDate()-1);;){let a=this.dateKey(e);if((this.history[a]||0)>0)o++,e.setDate(e.getDate()-1);else break}return o}exportData(){return{history:{...this.history}}}importData(o){o!=null&&o.history&&(this.history={...o.history})}todayKey(){return this.dateKey(new Date)}dateKey(o){return o.toISOString().split("T")[0]}};var Q=require("obsidian"),z6=class{constructor(o){this.app=o}async saveSnapshot(o,e){let a=this.app.vault.getAbstractFileByPath(o);if(!(a instanceof Q.TFile))throw new Error(`Scene file not found: ${o}`);let r=await this.app.vault.read(a),s=new Date().toISOString().replace(/[:.]/g,"-"),n=a.basename.replace(/[\\/:*?"<>|]/g,"-"),i=e.replace(/[\\/:*?"<>|]/g,"-").substring(0,40),l=this.getSnapshotDir(o);await this.ensureFolder(l);let d=`${n}__${s}__${i}.md`,c=(0,Q.normalizePath)(`${l}/${d}`),p=this.countWords(r),f=["<!-- StoryLine Snapshot",`  scene: ${o}`,`  label: ${e}`,`  timestamp: ${new Date().toISOString()}`,`  wordcount: ${p}`,"-->",""].join(`
`);return await this.app.vault.create(c,f+r),new Q.Notice(`Snapshot "${e}" saved`),{filePath:c,sceneFilePath:o,label:e,timestamp:new Date().toISOString(),wordcount:p}}async listSnapshots(o){let e=this.app.vault.getAbstractFileByPath(o);if(!(e instanceof Q.TFile))return[];let a=this.getSnapshotDir(o),r=this.app.vault.getAbstractFileByPath(a);if(!(r instanceof Q.TFolder))return[];let s=e.basename,n=[];for(let i of r.children){if(!(i instanceof Q.TFile)||!i.name.startsWith(s+"__"))continue;let l=i.basename.split("__");if(l.length<3)continue;let d=await this.app.vault.read(i),c=this.parseSnapshotHeader(d);n.push({filePath:i.path,sceneFilePath:o,label:c.label||l.slice(2).join("__"),timestamp:c.timestamp||l[1].replace(/-/g,":"),wordcount:c.wordcount})}return n.sort((i,l)=>l.timestamp.localeCompare(i.timestamp)),n}async readSnapshotContent(o){let e=this.app.vault.getAbstractFileByPath(o);if(!(e instanceof Q.TFile))throw new Error(`Snapshot not found: ${o}`);return(await this.app.vault.read(e)).replace(/^<!--[\s\S]*?-->\n?/,"")}async restoreSnapshot(o,e){let a=this.app.vault.getAbstractFileByPath(e);if(!(a instanceof Q.TFile))throw new Error(`Scene not found: ${e}`);let r=await this.readSnapshotContent(o);await this.app.vault.modify(a,r),new Q.Notice("Snapshot restored")}async deleteSnapshot(o){let e=this.app.vault.getAbstractFileByPath(o);e instanceof Q.TFile&&await this.app.vault.delete(e)}async compareSnapshot(o,e){let a=this.app.vault.getAbstractFileByPath(e);if(!(a instanceof Q.TFile))return{added:[],removed:[]};let r=await this.app.vault.read(a),s=await this.readSnapshotContent(o),n=r.split(`
`),i=s.split(`
`),l=new Set(n),d=new Set(i),c=n.filter(f=>!d.has(f)&&f.trim()),p=i.filter(f=>!l.has(f)&&f.trim());return{added:c,removed:p}}getSnapshotDir(o){let e=o.split("/");return e.pop(),(0,Q.normalizePath)(e.join("/")+"/.snapshots")}async ensureFolder(o){this.app.vault.getAbstractFileByPath(o)||await this.app.vault.createFolder(o)}countWords(o){return o.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/,"").trim().split(/\s+/).filter(r=>r.length>0).length}parseSnapshotHeader(o){var i,l,d,c,p;let e=o.match(/^<!--[\s\S]*?-->/);if(!e)return{};let a=e[0],r=(l=(i=a.match(/label:\s*(.+)/))==null?void 0:i[1])==null?void 0:l.trim(),s=(c=(d=a.match(/timestamp:\s*(.+)/))==null?void 0:d[1])==null?void 0:c.trim(),n=(p=a.match(/wordcount:\s*(\d+)/))==null?void 0:p[1];return{label:r,timestamp:s,wordcount:n?Number(n):void 0}}};var j6=class{constructor(o,e){this.cache=new Map;this.charNames=new Set;this.locNames=new Set;this.characterManager=o,this.locationManager=e}scan(o){let e=this.cache.get(o.filePath);if(e)return e;let a=this.performScan(o);return this.cache.set(o.filePath,a),a}scanAll(o){this.rebuildLookups();for(let e of o)this.cache.has(e.filePath)||this.cache.set(e.filePath,this.performScan(e));return this.cache}getResult(o){var e;return(e=this.cache.get(o))!=null?e:null}invalidate(o){this.cache.delete(o)}invalidateAll(){this.cache.clear()}rebuildLookups(){this.charNames.clear(),this.locNames.clear();for(let o of this.characterManager.getAllCharacters())this.charNames.add(o.name.toLowerCase()),o.nickname&&this.charNames.add(o.nickname.toLowerCase());for(let o of this.locationManager.getAllLocations())this.locNames.add(o.name.toLowerCase());for(let o of this.locationManager.getAllWorlds())this.locNames.add(o.name.toLowerCase())}performScan(o){let e=o.body||"",a=this.extractWikilinks(e);this.charNames.size===0&&this.locNames.size===0&&this.rebuildLookups();let r=new Map;for(let d of a){let c=d.toLowerCase();r.has(c)||r.set(c,d)}let s=[],n=[],i=[],l=[];for(let[d,c]of r){let p="other";this.charNames.has(d)?(p="character",n.push(c)):this.locNames.has(d)?(p="location",i.push(c)):l.push(c),s.push({name:c,type:p})}return{links:s,characters:n,locations:i,other:l}}extractWikilinks(o){let e=/\[\[([^\]]+)\]\]/g,a=[],r;for(;(r=e.exec(o))!==null;){let s=r[1],n=s.indexOf("|");n!==-1&&(s=s.substring(0,n));let i=s.indexOf("#");i!==-1&&(s=s.substring(0,i));let l=s.trim();l&&a.push(l)}return a}};var X6=class extends _.Plugin{constructor(){super(...arguments);this.settings=Y6;this.writingTracker=new _6;this.storyLeaf=null}async onload(){var a,r;await this.loadSettings(),this.sceneManager=new da(this.app,this),this.locationManager=new Rt(this.app),this.characterManager=new Vt(this.app),this.snapshotManager=new z6(this.app),this.linkScanner=new j6(this.characterManager,this.locationManager),this.sceneManager.undoManager.onAfterUndoRedo=async()=>{await this.sceneManager.initialize(),this.refreshOpenViews()};try{let s=this,n=!1,i=s.registeredExtensions,l=(r=(a=this.app)==null?void 0:a.vault)==null?void 0:r.registeredExtensions;Array.isArray(i)&&(n=i.includes("json")),!n&&Array.isArray(l)&&(n=l.includes("json")),n||(typeof s.registerExtensions=="function"?s.registerExtensions(["json"]):typeof this.app.registerExtensions=="function"&&this.app.registerExtensions(["json"]))}catch(s){console.error("StoryLine: failed to register .json extension",s)}this.registerView(nt,s=>new H6(s,this,this.sceneManager)),this.registerView(Mt,s=>new k6(s,this)),this.registerView(xt,s=>new F6(s,this,this.sceneManager)),this.registerView(gt,s=>new V6(s,this,this.sceneManager)),this.registerView(vt,s=>new N6(s,this,this.sceneManager)),this.registerView(yt,s=>new Z6(s,this,this.sceneManager)),this.registerView(bt,s=>new U6(s,this,this.sceneManager)),this.app.workspace.onLayoutReady(async()=>{await this.bootstrapProjects(),await this.migrateProjectDataFromSettings();try{let n=this.sceneManager.getLocationFolder();n&&await this.locationManager.loadAll(n);let i=this.sceneManager.getCharacterFolder();i&&await this.characterManager.loadCharacters(i)}catch(n){}this.linkScanner.rebuildLookups(),this.linkScanner.scanAll(this.sceneManager.getAllScenes()),this.writingTracker.importData(this.settings.writingTrackerData);let s=this.sceneManager.getStatistics();this.writingTracker.startSession(s.totalWords),this.refreshOpenViews()}),this.addRibbonIcon("layout-grid","StoryLine: Projects",()=>{new p8(this.app,this).open()}),this.addCommand({id:"open-board-view",name:"Open Board View",hotkeys:[{modifiers:["Mod","Shift"],key:"1"}],callback:()=>this.activateView(nt)}),this.addCommand({id:"open-timeline-view",name:"Open Timeline View",hotkeys:[{modifiers:["Mod","Shift"],key:"2"}],callback:()=>this.activateView(xt)}),this.addCommand({id:"open-plotgrid-view",name:"Open Plotgrid View",hotkeys:[{modifiers:["Mod","Shift"],key:"3"}],callback:()=>this.activateView(Mt)}),this.addCommand({id:"open-storyline-view",name:"Open Storyline View",hotkeys:[{modifiers:["Mod","Shift"],key:"4"}],callback:()=>this.activateView(gt)}),this.addCommand({id:"open-character-view",name:"Open Character View",hotkeys:[{modifiers:["Mod","Shift"],key:"5"}],callback:()=>this.activateView(vt)}),this.addCommand({id:"open-stats-view",name:"Open Statistics Dashboard",hotkeys:[{modifiers:["Mod","Shift"],key:"6"}],callback:()=>this.activateView(yt)}),this.addCommand({id:"open-location-view",name:"Open Location View",hotkeys:[{modifiers:["Mod","Shift"],key:"7"}],callback:()=>this.activateView(bt)}),this.addCommand({id:"create-new-scene",name:"Create New Scene",hotkeys:[{modifiers:["Mod","Shift"],key:"n"}],callback:()=>this.openQuickAdd()}),this.addCommand({id:"create-new-project",name:"Create New StoryLine Project",callback:()=>this.openNewProjectModal()}),this.addCommand({id:"fork-project",name:"Fork Current StoryLine Project",callback:()=>this.openForkProjectModal()}),this.addCommand({id:"undo",name:"Undo Last Scene Change",hotkeys:[{modifiers:["Mod"],key:"z"}],callback:async()=>{await this.sceneManager.undoManager.undo()}}),this.addCommand({id:"redo",name:"Redo Last Scene Change",hotkeys:[{modifiers:["Mod","Shift"],key:"z"}],callback:async()=>{await this.sceneManager.undoManager.redo()}}),this.addCommand({id:"export-project",name:"Export Project",hotkeys:[{modifiers:["Mod","Shift"],key:"e"}],callback:()=>{new Dt(this).open()}}),this.addSettingTab(new ra(this.app,this));let e=this.debounce(()=>this.refreshOpenViews(),500);this.registerEvent(this.app.vault.on("modify",s=>{s instanceof _.TFile&&this.sceneManager.handleFileChange(s).then(()=>e())})),this.registerEvent(this.app.vault.on("delete",s=>{s instanceof _.TFile&&(this.sceneManager.handleFileDelete(s.path),e())})),this.registerEvent(this.app.vault.on("rename",(s,n)=>{s instanceof _.TFile&&this.sceneManager.handleFileRename(s,n).then(async()=>{await this.updatePlotGridLinkedSceneIds(n,s.path),e()})}))}onunload(){try{let e=this.sceneManager.getStatistics();this.writingTracker.flushSession(e.totalWords),this.settings.writingTrackerData=this.writingTracker.exportData(),this.saveData(this.settings)}catch(e){}}async loadSettings(){this.settings=Object.assign({},Y6,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}async savePlotGrid(e){var a,r;try{let s=(r=(a=this.sceneManager)==null?void 0:a.activeProject)!=null?r:null,n;s?n=s.sceneFolder.replace(/\\/g,"/").replace(/\/Scenes\/?$/,""):n=`${this.settings.storyLineRoot.replace(/\\/g,"/")}/Plotgrid`;let i=`${n}/plotgrid.json`,l=this.app.vault.adapter;if((!e.rows||e.rows.length===0)&&await l.exists(i))try{let p=await l.read(i),f=JSON.parse(p);if(f.rows&&f.rows.length>0){console.log("[StoryLine] savePlotGrid: BLOCKED overwriting non-empty plotgrid with empty data");return}}catch(p){}let c=JSON.stringify(e,null,2);await l.exists(n)||await this.app.vault.createFolder(n),await l.write(i,c)}catch(s){new _.Notice("StoryLine: failed to save PlotGrid to vault: "+String(s))}}async loadPlotGrid(){var e,a;try{let r=(a=(e=this.sceneManager)==null?void 0:e.activeProject)!=null?a:null,s;r?s=r.sceneFolder.replace(/\\/g,"/").replace(/\/Scenes\/?$/,""):s=`${this.settings.storyLineRoot.replace(/\\/g,"/")}/Plotgrid`;let n=`${s}/plotgrid.json`,i=this.app.vault.adapter;if(!await i.exists(n))return null;let l=await i.read(n);return JSON.parse(l)}catch(r){return null}}async activateView(e){let{workspace:a}=this.app,r=null,s=a.getLeavesOfType(e);s.length>0?r=s[0]:(r=a.getLeaf(!1),r&&await r.setViewState({type:e,active:!0})),r&&a.revealLeaf(r)}async activateViewInPlace(e){let a=this.app.workspace.getLeaf(!1);await a.setViewState({type:e,active:!0,state:{}}),this.app.workspace.revealLeaf(a)}openQuickAdd(){new ut(this.app,this,this.sceneManager,async(a,r)=>{let s=await this.sceneManager.createScene(a);this.refreshOpenViews(),r&&await this.app.workspace.getLeaf("tab").openFile(s)}).open()}refreshOpenViews(){try{let a=this.sceneManager.getLocationFolder();a&&this.locationManager.loadAll(a);let r=this.sceneManager.getCharacterFolder();r&&this.characterManager.loadCharacters(r)}catch(a){}this.linkScanner.invalidateAll(),this.linkScanner.rebuildLookups(),this.linkScanner.scanAll(this.sceneManager.getAllScenes());let e=[nt,Mt,xt,gt,vt,bt,yt];for(let a of e){let r=this.app.workspace.getLeavesOfType(a);for(let s of r){let n=s.view;n&&"refresh"in n&&typeof n.refresh=="function"&&n.refresh()}}}async updatePlotGridLinkedSceneIds(e,a){try{let r=await this.loadPlotGrid();if(!(r!=null&&r.cells))return;let s=!1;for(let n of Object.keys(r.cells)){let i=r.cells[n];i.linkedSceneId===e&&(i.linkedSceneId=a,s=!0)}s&&await this.savePlotGrid(r)}catch(r){}}async createPlotGridIfMissing(){try{if(!await this.loadPlotGrid()){let a={rows:[],columns:[],cells:{},zoom:1};await this.savePlotGrid(a)}}catch(e){new _.Notice("StoryLine: failed to create PlotGrid file: "+String(e))}}debounce(e,a){let r=null;return(...s)=>{r&&clearTimeout(r),r=setTimeout(()=>e(...s),a)}}async migrateProjectDataFromSettings(){let e=await this.loadData();if(!e)return;let a=!1;if(e.definedActs&&typeof e.definedActs=="object"){for(let[r,s]of Object.entries(e.definedActs)){if(!Array.isArray(s)||s.length===0)continue;let i=this.sceneManager.getProjects().find(l=>l.filePath===r);i&&i.definedActs.length===0&&(i.definedActs=s.map(Number).filter(l=>!isNaN(l)),await this.sceneManager.saveProjectFrontmatter(i))}delete e.definedActs,a=!0}if(e.definedChapters&&typeof e.definedChapters=="object"){for(let[r,s]of Object.entries(e.definedChapters)){if(!Array.isArray(s)||s.length===0)continue;let i=this.sceneManager.getProjects().find(l=>l.filePath===r);i&&i.definedChapters.length===0&&(i.definedChapters=s.map(Number).filter(l=>!isNaN(l)),await this.sceneManager.saveProjectFrontmatter(i))}delete e.definedChapters,a=!0}if(Array.isArray(e.filterPresets)&&e.filterPresets.length>0){let r=this.sceneManager.activeProject;r&&r.filterPresets.length===0&&(r.filterPresets=e.filterPresets,await this.sceneManager.saveProjectFrontmatter(r)),delete e.filterPresets,a=!0}for(let r of["sceneFolder","characterFolder","locationFolder","plotGridFolder"])r in e&&(delete e[r],a=!0);a&&await this.saveData(e)}async bootstrapProjects(){if((await this.sceneManager.scanProjects()).length===0&&await this.openNewProjectModal())try{await this.activateView(nt)}catch(r){}}async openNewProjectModal(){return new Promise(e=>{let a=new _.Modal(this.app);a.titleEl.setText("New StoryLine Project");let r="";new _.Setting(a.contentEl).setName("Project name").setDesc("Each project gets its own scene, character and location folders.").addText(s=>{s.setPlaceholder("My Novel"),s.onChange(n=>r=n)}),new _.Setting(a.contentEl).addButton(s=>{s.setButtonText("Create").setCta().onClick(async()=>{if(r.trim())try{let n=await this.sceneManager.createProject(r.trim());await this.sceneManager.setActiveProject(n),this.refreshOpenViews();try{await this.activateView(nt)}catch(i){}a.close(),e(n)}catch(n){new _.Notice("Failed to create project: "+String(n)),e(null)}})}),new _.Setting(a.contentEl).addButton(s=>{s.setButtonText("Cancel").onClick(()=>{a.close(),e(null)})}),a.open()})}openForkProjectModal(){let e=this.sceneManager.activeProject;if(!e){new _.Notice("No active project to fork");return}let a=new _.Modal(this.app);a.titleEl.setText(`Fork "${e.title}"`);let r=`${e.title} - Variant`;new _.Setting(a.contentEl).setName("New project name").setDesc("All scenes from the current project will be copied.").addText(s=>{s.setValue(r),s.onChange(n=>r=n)}),new _.Setting(a.contentEl).addButton(s=>{s.setButtonText("Fork").setCta().onClick(async()=>{if(!r.trim())return;let n=await this.sceneManager.forkProject(e,r.trim());await this.sceneManager.setActiveProject(n),this.refreshOpenViews();try{await this.activateView(nt)}catch(i){}a.close()})}),a.open()}},p8=class extends _.Modal{constructor(o,e){super(o),this.plugin=e,this.titleEl.setText("Open StoryLine Project")}onOpen(){let{contentEl:o}=this;o.empty(),o.createDiv({cls:"project-select-info"}).createEl("p",{text:"Select a project to load, or create a new one."});let r=o.createDiv({cls:"project-list"}).createEl("select",{cls:"project-select-dropdown"});r.addEventListener("keydown",d=>d.stopPropagation());let s=o.createDiv({cls:"project-actions"}),n=s.createEl("button",{text:"Open",cls:"mod-cta"});n.setAttr("type","button"),n.addEventListener("click",async()=>{let d=r.value,p=this.plugin.sceneManager.getProjects().find(f=>f.filePath===d);if(!p){new _.Notice("No project selected");return}try{await this.plugin.sceneManager.setActiveProject(p),this.plugin.refreshOpenViews();try{await this.plugin.activateView(nt)}catch(f){}this.close()}catch(f){new _.Notice("Failed to open project: "+String(f))}});let i=s.createEl("button",{text:"Create New Project",cls:"mod-cta"});i.setAttr("type","button"),i.addEventListener("click",async()=>{let d=await this.plugin.openNewProjectModal();try{await this.plugin.sceneManager.scanProjects();let c=this.plugin.sceneManager.getProjects();r.empty();for(let p of c)r.createEl("option",{text:p.title}).setAttr("value",p.filePath);c.length>0&&(r.value=d&&d.filePath||c[0].filePath)}catch(c){new _.Notice("Failed to refresh projects: "+String(c))}});let l=s.createEl("button",{text:"Cancel",cls:"mod-quiet"});l.setAttr("type","button"),l.addEventListener("click",()=>this.close()),(async()=>{try{await this.plugin.sceneManager.scanProjects();let d=this.plugin.sceneManager.getProjects();d.length===0&&r.createEl("option",{text:"No projects found"}).setAttribute("disabled","true");for(let c of d)r.createEl("option",{text:c.title}).setAttr("value",c.filePath);if(d.length>0){let c=this.plugin.sceneManager.activeProject;r.value=c&&d.some(p=>p.filePath===c.filePath)?c.filePath:d[0].filePath}}catch(d){r.createEl("option",{text:"Error loading projects"}).setAttribute("disabled","true")}})()}};
/*! Bundled license information:

lucide/dist/esm/createElement.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/replaceElement.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/defaultAttributes.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/a-arrow-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/a-arrow-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/a-large-small.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/accessibility.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/activity-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/activity.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/air-vent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/airplay.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-clock-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-clock-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-clock-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-clock-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-clock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alarm-smoke.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/album.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alert-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alert-octagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/alert-triangle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-center-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-center-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-center.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-end-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-end-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-distribute-center.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-distribute-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-distribute-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-justify-center.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-justify-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-justify-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-space-around.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-horizontal-space-between.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-justify.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-start-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-start-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-distribute-center.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-distribute-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-distribute-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-justify-center.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-justify-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-justify-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-space-around.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/align-vertical-space-between.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ambulance.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ampersand.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ampersands.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/anchor.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/angry.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/annoyed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/antenna.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/anvil.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/aperture.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/app-window.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/apple.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/archive-restore.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/archive-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/archive.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/area-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/armchair.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-down-dash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-left-dash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-right-dash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-up-dash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-big-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-0-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-1-0.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-a-z.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-from-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-left-from-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-left-from-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-left-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-narrow-wide.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-right-from-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-right-from-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-right-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-to-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-to-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-wide-narrow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down-z-a.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left-from-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left-to-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right-from-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right-to-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-0-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-1-0.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-a-z.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-from-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-from-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-left-from-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-left-from-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-left-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-narrow-wide.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-right-from-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-right-from-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-right-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-to-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-wide-narrow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up-z-a.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrow-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/arrows-up-from-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/asterisk-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/asterisk.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/at-sign.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/atom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/audio-lines.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/audio-waveform.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/award.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/axe.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/axis-3d.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/baby.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/backpack.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-alert.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-cent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-dollar-sign.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-euro.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-help.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-indian-rupee.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-info.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-japanese-yen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-percent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-pound-sterling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-russian-ruble.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-swiss-franc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/badge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/baggage-claim.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ban.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/banana.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/banknote.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-big.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-horizontal-big.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bar-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/barcode.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/baseline.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bath.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery-charging.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery-full.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery-low.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery-medium.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery-warning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/battery.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/beaker.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bean-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bean.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bed-double.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bed-single.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/beef.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/beer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-electric.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell-ring.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bell.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/between-horizontal-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/between-horizontal-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/between-vertical-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/between-vertical-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bike.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/binary.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/biohazard.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bird.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bitcoin.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/blend.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/blinds.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/blocks.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bluetooth-connected.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bluetooth-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bluetooth-searching.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bluetooth.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bold.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bolt.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bomb.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-a.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-audio.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-copy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-headphones.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-image.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-key.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-lock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-marked.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-open-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-open-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-type.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-up-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-user.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/book.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bookmark-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bookmark-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bookmark-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bookmark-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bookmark.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/boom-box.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/box-select.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/box.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/boxes.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/braces.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brackets.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brain-circuit.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brain-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brain.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brick-wall.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/briefcase.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bring-to-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/brush.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bug-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bug-play.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bug.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/building-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/building.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bus-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/bus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cable-car.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cable.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cake-slice.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cake.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calculator.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-check-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-clock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-days.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-fold.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-minus-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-plus-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-range.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-x-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/calendar.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/camera-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/camera.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/candlestick-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/candy-cane.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/candy-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/candy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/captions-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/captions.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/car-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/car-taxi-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/car.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/caravan.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/carrot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/case-lower.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/case-sensitive.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/case-upper.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cassette-tape.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cast.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/castle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cctv.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check-circle-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check-square-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chef-hat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cherry.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-down-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-down-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-first.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-last.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-left-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-left-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-right-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-right-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-up-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-up-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-down-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-left-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-right-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-up-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevrons-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chrome.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/church.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cigarette-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cigarette.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-dollar-sign.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-dot-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-ellipsis.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-equal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-fading-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-slash-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-slash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-user-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle-user.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/circuit-board.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/citrus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clapperboard.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-copy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-list.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-paste.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-pen-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-type.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clipboard.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-10.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-11.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-12.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-5.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-6.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-7.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-8.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock-9.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-drizzle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-fog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-hail.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-lightning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-moon-rain.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-moon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-rain-wind.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-rain.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-snow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-sun-rain.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud-sun.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloud.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cloudy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clover.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/club.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/code-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/code-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/codepen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/codesandbox.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/coffee.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/coins.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/columns-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/columns-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/columns-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/combine.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/command.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/compass.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/component.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/computer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/concierge-bell.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/construction.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/contact-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/contact.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/container.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/contrast.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cookie.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cooking-pot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy-slash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copyleft.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/copyright.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-down-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-down-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-left-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-left-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-right-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-right-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-up-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/corner-up-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cpu.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/creative-commons.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/credit-card.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/croissant.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/crop.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cross.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/crosshair.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/crown.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cuboid.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cup-soda.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/currency.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/cylinder.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/database-backup.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/database-zap.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/database.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/delete.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dessert.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/diameter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/diamond.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-5.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dice-6.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dices.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/diff.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/disc-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/disc-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/disc-album.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/disc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/divide-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/divide-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/divide.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dna-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dna.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dollar-sign.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/donut.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/door-closed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/door-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dot-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/download-cloud.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/download.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/drafting-compass.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/drama.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dribbble.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/drill.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/droplet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/droplets.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/drum.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/drumstick.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/dumbbell.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ear-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ear.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/eclipse.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/egg-fried.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/egg-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/egg.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/equal-not.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/equal-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/equal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/eraser.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/euro.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/expand.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/external-link.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/eye-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/eye.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/facebook.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/factory.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fan.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fast-forward.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/feather.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fence.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ferris-wheel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/figma.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-archive.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-audio-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-audio.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-axis-3d.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-badge-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-badge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-bar-chart-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-bar-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-box.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-check-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-clock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-code-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-diff.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-digit.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-image.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-input.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-json-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-json.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-key-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-key.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-line-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-lock-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-lock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-minus-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-music.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-output.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-pen-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-pie-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-plus-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-question.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-scan.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-search-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-sliders.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-spreadsheet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-stack.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-symlink.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-terminal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-type-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-type.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-video-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-video.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-volume-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-volume.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-warning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-x-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/file.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/files.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/film.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/filter-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/filter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fingerprint.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fire-extinguisher.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fish-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fish-symbol.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fish.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flag-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flag-triangle-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flag-triangle-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flag.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flame-kindling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flame.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flashlight-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flashlight.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flask-conical-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flask-conical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flask-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flip-horizontal-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flip-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flip-vertical-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flip-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flower-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/flower.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/focus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fold-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fold-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-archive.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-clock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-closed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-git-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-git.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-input.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-kanban.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-key.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-lock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-open-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-output.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-root.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-search-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-symlink.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-sync.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-tree.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folder.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/folders.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/footprints.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/forklift.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/form-input.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/forward.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/frame.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/framer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/frown.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fuel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/fullscreen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/function-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gallery-horizontal-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gallery-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gallery-thumbnails.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gallery-vertical-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gallery-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gamepad-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gamepad.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gantt-chart-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gantt-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gauge-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gauge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gavel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gem.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ghost.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gift.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-branch-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-branch.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-commit-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-commit-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-compare-arrows.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-compare.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-fork.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-graph.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-merge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request-arrow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request-closed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request-create-arrow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request-create.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request-draft.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/git-pull-request.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/github.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/gitlab.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/glass-water.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/glasses.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/globe-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/globe.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/goal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grab.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/graduation-cap.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grape.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grid-2x2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grid-3x3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grip-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grip-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/grip.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/group.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/guitar.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hammer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand-coins.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand-helping.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand-metal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand-platter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hand.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/handshake.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hard-drive-download.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hard-drive-upload.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hard-drive.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hard-hat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/haze.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hdmi-port.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-5.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading-6.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heading.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/headphones.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/headset.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heart-crack.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heart-handshake.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heart-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heart-pulse.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/heater.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/help-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hexagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/highlighter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/history.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/home.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hop-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hop.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hotel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/hourglass.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ice-cream-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ice-cream.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/image-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/image-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/image-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/image-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/image.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/images.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/import.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/inbox.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/indent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/indian-rupee.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/infinity.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/info.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/inspection-panel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/instagram.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/italic.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/iteration-ccw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/iteration-cw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/japanese-yen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/joystick.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/kanban-square-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/kanban-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/kanban.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/key-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/key-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/key.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/keyboard-music.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/keyboard.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp-ceiling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp-desk.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp-floor.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp-wall-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp-wall-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lamp.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/land-plot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/landmark.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/languages.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/laptop-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/laptop.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lasso-select.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lasso.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/laugh.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layers-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layers-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layers.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-dashboard.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-grid.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-list.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-panel-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-panel-top.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/layout-template.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/leaf.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/leafy-green.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/library-big.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/library-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/library.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/life-buoy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ligature.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lightbulb-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lightbulb.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/line-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/link-2-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/link-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/link.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/linkedin.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-checks.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-collapse.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-end.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-filter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-music.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-ordered.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-restart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-start.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-todo.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-tree.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-video.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/list.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/loader-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/loader.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/locate-fixed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/locate-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/locate.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lock-keyhole.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/log-in.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/log-out.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/lollipop.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/luggage.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/m-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/magnet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-question.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-warning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mail.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mailbox.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mails.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/map-pin-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/map-pin.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/map-pinned.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/map.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/martini.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/maximize-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/maximize.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/medal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/megaphone-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/megaphone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/meh.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/memory-stick.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/menu-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/menu.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/merge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-more.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-question.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-reply.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-warning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-diff.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-heart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-more.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-quote.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-reply.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-share.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-warning.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/message-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/messages-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mic-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mic-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mic.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/microscope.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/microwave.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/milestone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/milk-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/milk.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/minimize-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/minimize.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/minus-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/minus-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-pause.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-play.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-smartphone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-speaker.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-stop.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/monitor.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/moon-star.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/moon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/more-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/more-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mountain-snow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mountain.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse-pointer-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse-pointer-click.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse-pointer-square-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse-pointer-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse-pointer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/mouse.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-3d.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-diagonal-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-diagonal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-down-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-down-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-up-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-up-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/move.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/music-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/music-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/music-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/music.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/navigation-2-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/navigation-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/navigation-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/navigation.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/network.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/newspaper.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/nfc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notebook-pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notebook-tabs.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notebook-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notebook.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notepad-text-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/notepad-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/nut-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/nut.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/octagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/option.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/orbit.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/outdent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/package.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paint-bucket.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paint-roller.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paintbrush-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paintbrush.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/palette.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/palmtree.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-bottom-close.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-bottom-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-bottom-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-bottom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-left-close.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-left-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-left-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-right-close.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-right-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-right-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-top-close.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-top-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-top-open.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panel-top.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panels-left-bottom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panels-right-bottom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/panels-top-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paperclip.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parentheses.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parking-circle-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parking-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parking-meter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parking-square-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/parking-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/party-popper.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pause-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pause-octagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pause.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/paw-print.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pc-case.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pen-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pen-tool.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pencil-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pencil-ruler.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pencil.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pentagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/percent-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/percent-diamond.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/percent-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/percent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/person-standing.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-call.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-forwarded.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-incoming.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-missed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone-outgoing.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/phone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pi-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pi.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/piano.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pickaxe.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/picture-in-picture-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/picture-in-picture.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pie-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/piggy-bank.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pilcrow-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pilcrow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pill.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pin-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pin.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pipette.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pizza.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plane-landing.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plane-takeoff.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plane.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/play-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/play-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/play.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plug-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plug-zap-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plug-zap.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plug.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plus-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plus-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pocket-knife.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pocket.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/podcast.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pointer-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pointer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/popcorn.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/popsicle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pound-sterling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/power-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/power-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/power-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/power.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/presentation.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/printer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/projector.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/puzzle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pyramid.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/qr-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/quote.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rabbit.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radar.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radiation.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radio-receiver.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radio-tower.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radio.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/radius.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rail-symbol.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rainbow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ratio.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-cent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-euro.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-indian-rupee.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-japanese-yen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-pound-sterling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-russian-ruble.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-swiss-franc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/receipt.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rectangle-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rectangle-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/recycle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/redo-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/redo-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/redo.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/refresh-ccw-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/refresh-ccw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/refresh-cw-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/refresh-cw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/refrigerator.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/regex.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/remove-formatting.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/repeat-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/repeat-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/repeat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/replace-all.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/replace.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/reply-all.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/reply.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rewind.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ribbon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rocket.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rocking-chair.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/roller-coaster.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rotate-3d.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rotate-ccw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rotate-cw.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/route-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/route.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/router.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rows-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rows-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rows-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rss.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ruler.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/russian-ruble.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sailboat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/salad.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sandwich.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/satellite-dish.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/satellite.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/save-all.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/save.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scale-3d.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scale.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scaling.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-barcode.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-eye.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-face.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-line.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scan.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scatter-chart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/school-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/school.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scissors-line-dashed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scissors-square-dashed-bottom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scissors-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scissors.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/screen-share-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/screen-share.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scroll-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/scroll.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/search-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/search-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/search-slash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/search-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/send-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/send-to-back.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/send.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/separator-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/separator-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/server-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/server-crash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/server-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/server.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/settings-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/settings.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shapes.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/share-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/share.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sheet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shell.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-alert.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-ban.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-ellipsis.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-half.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-question.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shield.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ship-wheel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ship.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shirt.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shopping-bag.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shopping-basket.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shopping-cart.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shovel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shower-head.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shrink.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shrub.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/shuffle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sigma-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sigma.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signal-high.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signal-low.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signal-medium.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signal-zero.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signpost-big.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/signpost.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/siren.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/skip-back.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/skip-forward.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/skull.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/slack.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/slash-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/slash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/slice.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sliders-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sliders.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/smartphone-charging.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/smartphone-nfc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/smartphone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/smile-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/smile.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/snail.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/snowflake.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sofa.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/soup.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/space.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/spade.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sparkle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sparkles.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/speaker.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/speech.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/spell-check-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/spell-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/spline.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/split-square-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/split-square-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/split.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/spray-can.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sprout.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-dashed-bottom-code.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-dashed-bottom.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-pen.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-radical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-stack.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-user-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square-user.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/squircle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/squirrel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/stamp.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/star-half.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/star-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/star.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/step-back.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/step-forward.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/stethoscope.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sticker.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sticky-note.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/stop-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/store.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/stretch-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/stretch-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/strikethrough.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/subscript.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sun-dim.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sun-medium.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sun-moon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sun-snow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sun.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sunrise.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sunset.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/superscript.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/swatch-book.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/swiss-franc.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/switch-camera.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/sword.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/swords.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/syringe.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-cells-merge.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-cells-split.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-columns-split.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-properties.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table-rows-split.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/table.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tablet-smartphone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tablet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tablets.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tag.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tags.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tally-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tally-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tally-3.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tally-4.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tally-5.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tangent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/target.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/telescope.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tent-tree.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/terminal-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/terminal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/test-tube-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/test-tube.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/test-tubes.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text-cursor-input.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text-cursor.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text-quote.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text-select.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/theater.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/thermometer-snowflake.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/thermometer-sun.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/thermometer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/thumbs-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/thumbs-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-percent.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-slash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ticket.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/timer-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/timer-reset.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/timer.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/toggle-left.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/toggle-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tornado.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/torus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/touchpad-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/touchpad.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tower-control.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/toy-brick.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tractor.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/traffic-cone.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/train-front-tunnel.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/train-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/train-track.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tram-front.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trash-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trash.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tree-deciduous.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tree-pine.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trees.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trello.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trending-down.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trending-up.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/triangle-right.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/triangle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trophy.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/truck.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/turtle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tv-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/tv.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/twitch.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/twitter.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/type.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/umbrella-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/umbrella.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/underline.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/undo-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/undo-dot.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/undo.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unfold-horizontal.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unfold-vertical.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/ungroup.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unlink-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unlink.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unlock-keyhole.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unlock.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/unplug.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/upload-cloud.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/upload.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/usb.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-check.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-cog.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-minus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-plus.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-search.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/user.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/users-round.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/users.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/utensils-crossed.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/utensils.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/utility-pole.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/variable.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/vault.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/vegan.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/venetian-mask.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/vibrate-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/vibrate.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/video-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/video.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/videotape.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/view.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/voicemail.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/volume-1.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/volume-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/volume-x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/volume.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/vote.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wallet-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wallet-cards.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wallet.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wallpaper.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wand-2.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wand.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/warehouse.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/washing-machine.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/watch.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/waves.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/waypoints.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/webcam.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/webhook-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/webhook.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/weight.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wheat-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wheat.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/whole-word.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wifi-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wifi.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wind.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wine-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wine.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/workflow.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wrap-text.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/wrench.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/x-circle.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/x-octagon.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/x-square.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/x.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/youtube.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/zap-off.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/zap.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/zoom-in.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/zoom-out.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/iconsAndAliases.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/lucide.js:
  (**
   * @license lucide v0.336.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
