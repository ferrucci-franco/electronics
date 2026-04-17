(function(){
  const TP_STORAGE_KEY='pendulum_tp_progress_v1';
  const TP_STEPS=[
    {
      id:'real-first',
      title:'Mesure reelle',
      kicker:'Etape 1',
      subtitle:'Commencez par le pendule reel: observez avant de modeliser.',
      instructions:[
        'Connectez le prototype, lancez une acquisition courte et faites osciller le pendule avec une faible amplitude.',
        'Le but est de produire une premiere trace theta(t) exploitable, sans chercher encore a expliquer toute la physique.'
      ],
      questions:[
        {type:'text',id:'signal_observation',label:'Decrivez la trace obtenue.',help:'Mentionnez amplitude, regularite, amortissement et eventuels problemes de mesure.',min:35}
      ],
      resources:[{label:'Ouvrir Acquisition',tab:'acq'}]
    },
    {
      id:'period-real',
      title:'Periode experimentale',
      kicker:'Etape 2',
      subtitle:'Mesurez le temps d une oscillation a partir des donnees.',
      instructions:[
        'Utilisez l analyse de periode ou une mesure manuelle sur plusieurs oscillations.',
        'Expliquez pourquoi mesurer plusieurs periodes puis diviser est souvent plus robuste qu une seule oscillation.'
      ],
      questions:[
        {type:'number',id:'period_value',label:'Periode mesuree Texp (s)',minValue:0.1,maxValue:10},
        {type:'qcm',id:'period_mass_guess',label:'Avant de changer la masse, que pensez-vous observer a petite amplitude ?',options:[
          ['depends_mass','La periode depend fortement de la masse.'],
          ['depends_length','La periode depend surtout de la longueur.'],
          ['depends_color','La periode depend de la couleur de la masse.']
        ],answer:'depends_length'}
      ],
      resources:[{label:'Ouvrir Post-processing',tab:'post'}]
    },
    {
      id:'fit-r',
      title:'Ajustement sinusoidal',
      kicker:'Etape 3',
      subtitle:'Ajustez une sinusoide amortie et interpretez R.',
      instructions:[
        'Lancez l ajustement sinusoidal sur une fenetre propre du signal.',
        'Le coefficient R quantifie la qualite de l ajustement, mais il ne prouve pas a lui seul que le modele physique est complet.'
      ],
      questions:[
        {type:'number',id:'fit_r',label:'Valeur de R ou R2 obtenue',minValue:0,maxValue:1.05},
        {type:'qcm',id:'r_meaning',label:'Un R tres eleve signifie...',options:[
          ['perfect_physics','que le modele physique est exact dans toutes les conditions.'],
          ['good_fit','que la fonction ajustee explique bien les donnees dans la fenetre choisie.'],
          ['no_noise','que la mesure ne contient aucun bruit.']
        ],answer:'good_fit'},
        {type:'text',id:'fit_comment',label:'Pourquoi R ne suffit-il pas pour valider tout le modele ?',min:30}
      ],
      resources:[{label:'Ouvrir l ajustement',tab:'post'}]
    },
    {
      id:'phase',
      title:'Portrait de phase',
      kicker:'Etape 4',
      subtitle:'Passez de theta(t) a l espace d etat.',
      instructions:[
        'Lancez le portrait de phase: theta en abscisse, vitesse angulaire en ordonnee.',
        'Observez si la trajectoire ressemble a une boucle, a une spirale, ou a une courbe deformee.'
      ],
      questions:[
        {type:'qcm',id:'phase_spiral',label:'Pour un pendule reel amorti, le portrait de phase tend a...',options:[
          ['closed','une boucle parfaitement fermee.'],
          ['spiral','une spirale vers l origine.'],
          ['line','une droite horizontale.']
        ],answer:'spiral'},
        {type:'text',id:'phase_comment',label:'Que revele ce portrait que theta(t) montre moins directement ?',min:30}
      ],
      resources:[{label:'Ouvrir Portrait de phase',tab:'post'}]
    },
    {
      id:'model',
      title:'Modele physique',
      kicker:'Etape 5',
      subtitle:'Deduisez l equation differentielle a partir de la somme des couples.',
      instructions:[
        'Partez de la relation somme des couples = moment d inertie fois acceleration angulaire.',
        'Identifiez le couple du poids, le moment d inertie et le signe de rappel. Ne copiez pas une formule: reconstruisez-la.'
      ],
      questions:[
        {type:'text',id:'ode_derivation',label:'Ecrivez les grandes etapes de votre deduction.',min:45},
        {type:'text',id:'first_order',label:'Exprimez le modele sous deux equations du premier ordre: d(theta)/dt = ... et d(omega)/dt = ...',min:25}
      ],
      resources:[]
    },
    {
      id:'state-space',
      title:'Forme d etat',
      kicker:'Etape 6',
      subtitle:'Discutez la forme dx/dt = A x + B u.',
      instructions:[
        'Le pendule complet contient un terme non lineaire. La question est donc: peut-on vraiment l ecrire sous forme lineaire ?',
        'Cherchez l hypothese qui permet de remplacer le modele non lineaire par un modele lineaire local.'
      ],
      questions:[
        {type:'qcm',id:'linear_complete',label:'Le modele complet du pendule est lineaire ?',options:[
          ['yes','Oui, toujours.'],
          ['no_sin','Non, a cause du terme sin(theta).'],
          ['only_mass','Oui seulement si la masse est constante.']
        ],answer:'no_sin'},
        {type:'text',id:'linear_hypothesis',label:'Sous quelle hypothese obtient-on un modele lineaire ?',min:25}
      ],
      resources:[]
    },
    {
      id:'modelica',
      title:'Simulation Modelica',
      kicker:'Etape 7',
      subtitle:'Completez le modele sans que les equations differentielles soient donnees.',
      instructions:[
        'Copiez ce squelette Modelica et completez uniquement les deux lignes de derivees.',
        'Les parametres sont fournis pour gagner du temps sur la syntaxe, pas pour remplacer le raisonnement physique.'
      ],
      code:`model PendulumTP
  parameter Real L = 0.50 "length [m]";
  parameter Real m = 0.30 "mass [kg]";
  parameter Real b = 0.02 "viscous damping";
  parameter Real g = 9.81 "gravity [m/s2]";

  Real theta(start = 0.25) "angle [rad]";
  Real omega(start = 0.0) "angular speed [rad/s]";

equation
  der(theta) = /* TO COMPLETE */;
  der(omega) = /* TO COMPLETE */;
end PendulumTP;`,
      questions:[
        {type:'text',id:'modelica_equations',label:'Quelles lignes avez-vous completees dans Modelica ?',min:20}
      ],
      resources:[
        {label:'Ouvrir Acquisition/Simulation',tab:'acq'},
        {label:'Ouvrir viewer OpenModelica',href:'./../openmodelica-viewer/index.html'}
      ]
    },
    {
      id:'modelica-period',
      title:'Mesure automatique',
      kicker:'Etape 8',
      subtitle:'Utilisez un bloc Modelica pour mesurer la periode cycle par cycle.',
      instructions:[
        'Ce bloc detecte des passages par zero dans le meme sens et mesure le temps entre deux passages successifs.',
        'Il est donne comme instrument de mesure: votre travail est d interpreter ce qu il mesure.'
      ],
      code:`model PeriodMeter
  input Real theta;
  output Real T;
protected
  discrete Real lastCrossing(start = 0);
  discrete Boolean hasCrossing(start = false);
algorithm
  when theta > 0 then
    if pre(hasCrossing) then
      T := time - pre(lastCrossing);
    end if;
    lastCrossing := time;
    hasCrossing := true;
  end when;
end PeriodMeter;`,
      questions:[
        {type:'qcm',id:'period_crossing',label:'Pourquoi utiliser deux passages par zero dans le meme sens ?',options:[
          ['half','Parce que cela mesure une demi-periode.'],
          ['full','Parce que cela mesure une periode complete.'],
          ['noise','Parce que cela supprime toute erreur de mesure.']
        ],answer:'full'}
      ],
      resources:[{label:'Ouvrir viewer OpenModelica',href:'./../openmodelica-viewer/index.html'}]
    },
    {
      id:'mass-length',
      title:'Masse et longueur',
      kicker:'Etape 9',
      subtitle:'Superposez des simulations et testez l intuition de Galilee.',
      instructions:[
        'Changez la masse dans la simulation a faible amplitude, puis superposez deux fichiers de resultats.',
        'Ensuite changez la longueur et observez si l effet est du meme ordre.'
      ],
      questions:[
        {type:'qcm',id:'galileo',label:'A faible amplitude, quel parametre controle principalement la periode ?',options:[
          ['mass','La masse m.'],
          ['length','La longueur L.'],
          ['damping_only','Uniquement l amortissement.']
        ],answer:'length'},
        {type:'text',id:'mass_length_comment',label:'Resumez vos observations masse vs longueur.',min:35}
      ],
      resources:[{label:'Ouvrir viewer OpenModelica',href:'./../openmodelica-viewer/index.html'}]
    },
    {
      id:'sysid-rmse',
      title:'Identification et RMSE',
      kicker:'Etape 10',
      subtitle:'Comparez le modele aux donnees par une erreur quantitative.',
      instructions:[
        'Lancez l identification de systeme sur une fenetre propre.',
        'Le RMSE mesure l ecart quadratique moyen entre donnees et modele. Il a les unites de la grandeur comparee.'
      ],
      questions:[
        {type:'number',id:'rmse_value',label:'RMSE obtenu',minValue:0,maxValue:1000},
        {type:'qcm',id:'rmse_units',label:'Si theta est en degres, le RMSE est...',options:[
          ['degrees','en degres.'],
          ['seconds','en secondes.'],
          ['unitless','sans unite.']
        ],answer:'degrees'},
        {type:'text',id:'rmse_comment',label:'Que peut rendre le RMSE mauvais meme si le modele semble raisonnable ?',min:30}
      ],
      resources:[{label:'Ouvrir System ID',tab:'post'}]
    },
    {
      id:'prototype-change',
      title:'Changer L sur le prototype',
      kicker:'Etape 11',
      subtitle:'Relancez une mesure reelle et verifiez si le modele suit.',
      instructions:[
        'Modifiez la longueur effective du prototype, refaites une acquisition, puis comparez periode experimentale, simulation et identification.',
        'Concluez sur le domaine de validite du modele et sur les sources d ecart.'
      ],
      questions:[
        {type:'number',id:'new_length',label:'Nouvelle longueur L (m)',minValue:0.05,maxValue:2},
        {type:'number',id:'new_period',label:'Nouvelle periode mesuree (s)',minValue:0.1,maxValue:10},
        {type:'text',id:'final_conclusion',label:'Conclusion courte du TP',min:60}
      ],
      resources:[{label:'Ouvrir Acquisition',tab:'acq'},{label:'Ouvrir Post-processing',tab:'post'}]
    }
  ];

  let tpState={active:0,unlocked:0,completed:{},answers:{}};
  let switchTab=function(){};

  function loadTpState(){
    try{
      const raw=localStorage.getItem(TP_STORAGE_KEY);
      if(raw)tpState={...tpState,...JSON.parse(raw)};
    }catch(_){}
    tpState.active=Math.min(tpState.active||0,TP_STEPS.length-1);
    tpState.unlocked=Math.min(tpState.unlocked||0,TP_STEPS.length-1);
  }
  function saveTpState(){localStorage.setItem(TP_STORAGE_KEY,JSON.stringify(tpState));}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function completedCount(){return TP_STEPS.filter(s=>tpState.completed[s.id]).length;}
  function answerValue(id){return tpState.answers[id]??'';}
  function setAnswer(id,value){tpState.answers[id]=value;saveTpState();}

  function renderTpSidebar(){
    const list=document.getElementById('tpStepList');
    const count=completedCount();
    document.getElementById('tpProgressCount').textContent=`${count} / ${TP_STEPS.length}`;
    document.getElementById('tpProgressFill').style.width=`${Math.round(count/TP_STEPS.length*100)}%`;
    list.innerHTML=TP_STEPS.map((s,i)=>{
      const locked=i>tpState.unlocked;
      const done=!!tpState.completed[s.id];
      const cls=['tp-step-btn',i===tpState.active?'active':'',done?'done':''].filter(Boolean).join(' ');
      const status=done?'OK':locked?'LOCK':'';
      return `<button class="${cls}" type="button" data-tp-step="${i}" ${locked?'disabled':''}>
        <span class="tp-step-index">${done?'✓':i+1}</span>
        <span class="tp-step-title">${escapeHtml(s.title)}</span>
        <span class="tp-step-status">${status}</span>
      </button>`;
    }).join('');
    list.querySelectorAll('[data-tp-step]').forEach(btn=>{
      btn.addEventListener('click',()=>{tpState.active=parseInt(btn.dataset.tpStep,10);saveTpState();renderTp();});
    });
  }

  function renderTpQuestions(step){
    const target=document.getElementById('tpQuestions');
    if(!step.questions||!step.questions.length){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    target.innerHTML=`<h3>Questions et validation</h3>${step.questions.map(q=>{
      if(q.type==='qcm'){
        return `<div class="tp-field" data-question="${q.id}">
          <label>${escapeHtml(q.label)}</label>
          <div class="tp-qcm">${q.options.map(([value,label])=>`
            <label class="tp-option"><input type="radio" name="tp_${q.id}" value="${escapeHtml(value)}" ${answerValue(q.id)===value?'checked':''}><span>${escapeHtml(label)}</span></label>
          `).join('')}</div>
        </div>`;
      }
      if(q.type==='number'){
        return `<div class="tp-field">
          <label for="tp_${q.id}">${escapeHtml(q.label)}</label>
          <input class="tp-input" id="tp_${q.id}" type="number" step="any" value="${escapeHtml(answerValue(q.id))}">
        </div>`;
      }
      return `<div class="tp-field">
        <label for="tp_${q.id}">${escapeHtml(q.label)}</label>
        <textarea class="tp-textarea" id="tp_${q.id}">${escapeHtml(answerValue(q.id))}</textarea>
        ${q.help?`<div class="tp-help">${escapeHtml(q.help)}</div>`:''}
      </div>`;
    }).join('')}`;
    step.questions.forEach(q=>{
      if(q.type==='qcm'){
        target.querySelectorAll(`input[name="tp_${q.id}"]`).forEach(el=>el.addEventListener('change',e=>setAnswer(q.id,e.target.value)));
      }else{
        const el=document.getElementById(`tp_${q.id}`);
        if(el)el.addEventListener('input',e=>setAnswer(q.id,e.target.value));
      }
    });
  }

  function renderTpResources(step){
    const target=document.getElementById('tpResources');
    const hasCode=!!step.code;
    const hasResources=step.resources&&step.resources.length;
    if(!hasCode&&!hasResources){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    const code=hasCode?`<div class="tp-code"><button class="btn btn-sm" type="button" id="tpCopyCodeBtn">Copier</button><pre><code>${escapeHtml(step.code)}</code></pre></div>`:'';
    const links=hasResources?`<div class="tp-tools">${step.resources.map(r=>{
      if(r.tab)return `<button class="tp-link" type="button" data-resource-tab="${r.tab}">${escapeHtml(r.label)}</button>`;
      return `<a class="tp-link" href="${escapeHtml(r.href)}" target="_blank" rel="noopener">${escapeHtml(r.label)}</a>`;
    }).join('')}</div>`:'';
    target.innerHTML=`<h3>Outils</h3>${code}${links}`;
    const copy=document.getElementById('tpCopyCodeBtn');
    if(copy)copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(step.code);showTpFeedback('Code copie dans le presse-papiers.','ok');}
      catch(_){showTpFeedback('Impossible de copier automatiquement. Selectionnez le bloc de code manuellement.','warn');}
    });
    target.querySelectorAll('[data-resource-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.resourceTab)));
  }

  function renderTp(){
    const step=TP_STEPS[tpState.active];
    document.getElementById('tpKicker').textContent=step.kicker;
    document.getElementById('tpTitle').textContent=step.title;
    document.getElementById('tpSubtitle').textContent=step.subtitle;
    document.getElementById('tpInstructions').innerHTML=`<h3>Mission</h3><ul>${step.instructions.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    renderTpQuestions(step);
    renderTpResources(step);
    document.getElementById('tpPrevBtn').disabled=tpState.active===0;
    document.getElementById('tpNextBtn').disabled=tpState.active>=tpState.unlocked||tpState.active===TP_STEPS.length-1;
    document.getElementById('tpFeedback').className='tp-feedback';
    document.getElementById('tpFeedback').textContent='';
    renderTpSidebar();
  }

  function validateTpStep(){
    const step=TP_STEPS[tpState.active];
    for(const q of step.questions||[]){
      const val=answerValue(q.id);
      if(q.type==='qcm'&&val!==q.answer)return showTpFeedback('Revoyez la question QCM avant de valider cette etape.','warn');
      if(q.type==='text'&&String(val).trim().length<(q.min||1))return showTpFeedback('La reponse ouverte est encore trop courte pour valider cette etape.','warn');
      if(q.type==='number'){
        const n=parseFloat(val);
        if(!Number.isFinite(n))return showTpFeedback('Renseignez une valeur numerique valide.','warn');
        if(q.minValue!==undefined&&n<q.minValue)return showTpFeedback('La valeur numerique semble trop petite.','warn');
        if(q.maxValue!==undefined&&n>q.maxValue)return showTpFeedback('La valeur numerique semble trop grande.','warn');
      }
    }
    tpState.completed[step.id]=true;
    tpState.unlocked=Math.max(tpState.unlocked,Math.min(tpState.active+1,TP_STEPS.length-1));
    saveTpState();
    renderTp();
    showTpFeedback('Etape validee. La suite est debloquee.','ok');
  }

  function showTpFeedback(msg,kind){
    const el=document.getElementById('tpFeedback');
    el.textContent=msg;
    el.className=`tp-feedback show ${kind}`;
  }

  function exportTpAnswers(){
    const payload={
      exportedAt:new Date().toISOString(),
      completed:tpState.completed,
      answers:tpState.answers
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='reponses_tp_pendule.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.initTpGuide=function initTpGuide(options){
    switchTab=(options&&options.switchTab)||function(){};
    loadTpState();
    renderTp();
    document.getElementById('tpValidateBtn').addEventListener('click',validateTpStep);
    document.getElementById('tpPrevBtn').addEventListener('click',()=>{tpState.active=Math.max(0,tpState.active-1);saveTpState();renderTp();});
    document.getElementById('tpNextBtn').addEventListener('click',()=>{tpState.active=Math.min(tpState.unlocked,tpState.active+1);saveTpState();renderTp();});
    document.getElementById('tpResetBtn').addEventListener('click',()=>{
      if(!confirm('Reinitialiser le parcours TP sur ce navigateur ?'))return;
      localStorage.removeItem(TP_STORAGE_KEY);
      tpState={active:0,unlocked:0,completed:{},answers:{}};
      renderTp();
    });
    document.getElementById('tpExportBtn').addEventListener('click',exportTpAnswers);
    document.getElementById('tpGoAcqBtn').addEventListener('click',()=>switchTab('acq'));
  };
})();
