(function(){
  const TP_STORAGE_KEY='pendulum_tp_progress_v1';
  const TP_ALLOW_STEP_SKIP=false;

  const MODEL_CODE=`model PendulumTP
  parameter Real L = 0.50 "length [m]";
  parameter Real m = 0.30 "mass [kg]";
  parameter Real b = 0.02 "viscous damping";
  parameter Real g = 9.81 "gravity [m/s2]";

  Real theta(start = 0.25) "angle [rad]";
  Real omega(start = 0.0) "angular speed [rad/s]";

equation
  der(theta) = /* TO COMPLETE */;
  der(omega) = /* TO COMPLETE */;
end PendulumTP;`;

  const PERIOD_METER_CODE=`model PeriodMeter
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
end PeriodMeter;`;

  const TP_OMEGA_MODAL={
    EN:{
      title:'How the app estimates ω with less noise',
      body:[
        'For real data, the app uses the same centered-slope idea, but compares samples i - 2 and i + 2 instead of i - 1 and i + 1.',
        'The two points are a little farther apart, so the derivative estimate is less sensitive to measurement noise.',
        'With T = 0.02 s, the time between i - 2 and i + 2 is 4T = 0.08 s.'
      ],
      formulas:[
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{t[i+2]-t[i-2]}`,
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{4T}`
      ]
    },
    FR:{
      title:'Comment l’application estime ω avec moins de bruit',
      body:[
        'Pour des données réelles, l’application utilise la même idée de pente centrée, mais compare les échantillons i - 2 et i + 2 au lieu de i - 1 et i + 1.',
        'Les deux points sont un peu plus éloignés, donc l’estimation de la dérivée est moins sensible au bruit de mesure.',
        'Avec T = 0.02 s, le temps entre i - 2 et i + 2 vaut 4T = 0.08 s.'
      ],
      formulas:[
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{t[i+2]-t[i-2]}`,
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{4T}`
      ]
    },
    ES:{
      title:'Cómo estima la app ω con menos ruido',
      body:[
        'Para datos reales, la app usa la misma idea de pendiente centrada, pero compara las muestras i - 2 e i + 2 en vez de i - 1 e i + 1.',
        'Los dos puntos están un poco más separados, entonces la estimación de la derivada es menos sensible al ruido de medición.',
        'Con T = 0.02 s, el tiempo entre i - 2 e i + 2 vale 4T = 0.08 s.'
      ],
      formulas:[
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{t[i+2]-t[i-2]}`,
        String.raw`\hat{\omega}[i]=\frac{\theta[i+2]-\theta[i-2]}{4T}`
      ]
    }
  };

  const TP_TEXT={
    EN:{
      ui:{
        tab:'Lab guides',
        progress:'Lab progress',
        reset:'Reset',
        export:'Export answers',
        exportTitle:'Pendulum lab - validation answers',
        exportDate:'Date and time',
        exportStep:'Step',
        exportStatus:'Step status',
        exportValidated:'validated',
        exportNotValidated:'not validated',
        exportQuestions:'Questions',
        exportChosen:'Selected answer',
        exportNoAnswer:'(no answer)',
        prev:'Previous step',
        validate:'Validate step',
        next:'Next step',
        fallbackKicker:'Self-guided lab',
        fallbackTitle:'Pendulum lab',
        fallbackSubtitle:'Each step unlocks the next one. Answer, validate, then use the measurement, simulation, and analysis tools.',
        intro:'Introduction',
        mission:'Mission',
        questions:'Questions and validation',
        tools:'Tools',
        checklist:'Before continuing',
        copy:'Copy',
        copied:'Code copied to the clipboard.',
        copyFailed:'Automatic copy failed. Select the code block manually.',
        qcmWarn:'Review the multiple-choice question before validating this step.',
        textWarn:'The open answer is still too short to validate this step.',
        numberWarn:'Enter a valid numeric value.',
        minWarn:'The numeric value seems too small.',
        maxWarn:'The numeric value seems too large.',
        checklistWarn:'Check every item before validating this step.',
        valid:'Step validated. The next step is unlocked.',
        resetConfirm:'Reset the lab guide progress in this browser?',
        resetTitle:'Reset lab guide?',
        resetBody:'This will erase the TP progress and the answers stored in this browser.',
        resetCancel:'Cancel',
        resetOk:'Reset',
        done:'OK',
        locked:'LOCK'
      },
      steps:[
        {
          id:'real-first',
          title:'Real measurements',
          kicker:'Step 1',
          subtitle:'Start with the real pendulum: observe before modelling.',
          instructions:[
            {html:'Place the outer edge of the sliding mass at <strong class="tp-highlight">30 cm</strong> from the center of the rotating axis.'},
            'Connect the USB cable and start the acquisition.',
            'Set an initial condition close to 180 degrees, so the pendulum falls back on the same side from which it was raised and does not complete a full turn.',
            'Release it without giving it any initial speed by hand: let it go without pushing.',
            'Continue the acquisition until the oscillation amplitude is approximately 5 degrees.'
          ],
          questions:[],
          checklist:[
            {id:'real_mass_30cm',label:'I placed the mass at 30 cm.'},
            {id:'real_usb_connected',label:'I connected the USB cable to the pendulum, if it was not already connected.'},
            {id:'real_acquisition_180',label:'I started an acquisition with the pendulum at almost 180 degrees and without initial speed.'},
            {id:'real_csv_saved',label:'I saved the result as a CSV and wrote down the file name.'},
            {id:'real_csv_emailed',label:'I emailed myself the CSV so I can use it another day, in part 2 of this TP.'}
          ],
          resources:[{label:'Open Acquisition',tab:'acq'}]
        },
        {
          id:'period-real',
          requiresValidation:true,
          title:'Experimental period',
          kicker:'Step 2',
          subtitle:'Observe how the period evolves during the oscillation.',
          instructions:[
            'Open the Period vs. time analysis and launch it on the CSV recorded in step 1.',
            'Look at how the oscillation period evolves cycle by cycle while the pendulum loses amplitude.',
            'At large amplitude the pendulum is not perfectly isochronous; at small amplitude the period becomes almost constant.'
          ],
          questions:[
            {type:'qcm',id:'period_evolution',label:'In the Period vs. time graph, the period looks...',options:[
              ['constant','constant from the beginning.'],
              ['increasing','increasing as time goes on.'],
              ['decreasing','decreasing, then getting closer to a stable value.']
            ],answer:'decreasing'},
            {type:'qcm',id:'period_asymptotic',label:'Does the period seem to approach a limiting value?',options:[
              ['yes_asymptotic','Yes, it looks asymptotic toward a nearly constant value.'],
              ['no_asymptotic','No, it keeps drifting without settling.'],
              ['random','No, it is random from one oscillation to the next.']
            ],answer:'yes_asymptotic'}
          ],
          success:'Correct! That is exactly why a pendulum can work as a clock: at small oscillations, the period becomes almost constant. Big swings are dramatic, but little swings keep time. Galileo would probably nod approvingly.',
          resources:[{label:'Open Period vs. time',tab:'post',panel:'period'}]
        },
        {
          id:'phase',
          requiresValidation:true,
          title:'Phase portrait',
          kicker:'Step 3',
          subtitle:'Move from θ(t) to the state vector.',
          intro:[
            {html:'Until now we mainly looked at <strong>θ(t)</strong> (theta): the pendulum angle over time. But the mechanical state is not only where the pendulum is; it is also how fast it is moving and in which direction. That second variable is <strong>ω(t)</strong> (omega), the angular velocity.'},
            {html:'The sensor measures <strong>θ(t)</strong>. It does not directly measure <strong>ω(t)</strong>. The app estimates <strong>ω(t)</strong> by calculating the slope of <strong>θ(t)</strong>:'},
            {math:String.raw`\omega(t)=\frac{d\theta(t)}{dt}`},
            {html:'The data are sampled. If <strong>θ[i]</strong> is the measured angle at sample <strong>i</strong>, then sample <strong>i</strong> corresponds to:'},
            {math:String.raw`t_i=T\,i,\qquad T=0.02\,\mathrm{s}`},
            'Here T is the sampling period of the continuous signal. A simple centered-difference estimate is:',
            {math:String.raw`\hat{\omega}[i]=\frac{\theta[i+1]-\theta[i-1]}{2T}`},
            {html:'The little hat matters. We write <strong>ω hat</strong>, or <strong>ω̂</strong>, because this is not the true derivative <strong>ω(t)</strong>; it is an estimate computed from samples. Writing only <strong>ω</strong> would mean the exact angular velocity, and that is not measured directly here.'},
            {html:'Think of this as drawing a small triangle on the <strong>θ(t)</strong> curve between the points <strong>i - 1</strong> and <strong>i + 1</strong>. The derivative is just the slope of that triangle: <strong>ΔY/ΔX</strong>. In the mathematical definition, <strong>ΔX</strong> tends to zero; in sampled data, <strong>ΔX</strong> is finite, so we estimate the slope with nearby samples.'},
            {html:'Wait a minute... if we are at sample <strong>i</strong>, then sample <strong>i + 1</strong> has not happened yet at that instant. How can the app use data that comes “after”? This exact recipe could not be used as-is by a real-time controller that must react right now, because some samples have not arrived yet. Here that is fine: we are analyzing after the experiment. The signal has already happened and is stored, so the app can move backward and forward through it.'},
            {modal:'omegaAdvanced',labelHtml:'How does the app compute&nbsp;<strong>ω</strong>&nbsp;in practice?'}
          ],
          instructions:[
            {html:'Open the phase portrait analysis. First compare <strong>θ(t)</strong> and <strong>ω(t)</strong> in time. Then look at the plane <strong>(θ, ω)</strong>: each point is the instantaneous state of the pendulum.'},
            'Use zoom to compare two zones: large oscillations near the beginning, and small oscillations later. The change of shape is the physics.'
          ],
          questions:[
            {type:'qcm',id:'theta_omega_sync',label:'When comparing θ(t) and ω(t), what do we observe?',options:[
              ['same_max','θ and ω reach their maxima at the same time.'],
              ['derivative','When θ is maximum or minimum, ω is near zero; when θ crosses zero, |ω| is maximum.'],
              ['omega_max_theta_max','ω is maximum when θ is maximum.'],
              ['unrelated','ω has no clear relation with θ.']
            ],answer:'derivative'},
            {type:'qcm',id:'high_time_shape',label:'At large oscillations, the time signals look...',options:[
              ['perfect_sine','perfectly sinusoidal for both θ(t) and ω(t).'],
              ['random','random from one oscillation to the next.'],
              ['deformed','deformed compared with an ideal sinusoid: θ(t) is flatter near the extrema and ω(t) is more pointed.'],
              ['square','square, like a digital signal.']
            ],answer:'deformed'},
            {type:'qcm',id:'low_time_shape',label:'At small oscillations, θ(t) and ω(t) look more like...',options:[
              ['unrelated','two unrelated signals.'],
              ['same_max','two signals with maxima at the same time.'],
              ['triangle_square','one triangular signal and one square signal.'],
              ['shifted_sines','two almost sinusoidal signals, shifted in time.']
            ],answer:'shifted_sines'},
            {type:'qcm',id:'phase_shape_compare',label:'When comparing the phase portrait at large and small oscillations, what changes?',options:[
              ['ellipse_both','Both are perfect ellipses.'],
              ['line_both','Both are straight lines.'],
              ['diamond_ellipse','At large oscillations it is deformed, closer to a rounded diamond; at small oscillations it is closer to an ellipse.'],
              ['small_more_deformed','Small oscillations are more deformed than large ones.']
            ],answer:'diamond_ellipse'},
            {type:'qcm',id:'omega_derivative_causality',label:'Let’s use the idea from DS 3.5: systems and signals. The derivative algorithm used here looks at i - 2 and i + 2. How would you classify it?',options:[
              ['causal','Causal: it only needs the present and the past.'],
              ['noncausal','Non-causal: it uses a future sample, so it is useful here for post-processing a recorded signal.'],
              ['recorded_file','Causal because i + 2 is in the same recorded file.'],
              ['unrelated','Causality does not apply to sampled signals.']
            ],answer:'noncausal'}
          ],
          success:'Correct. This is the key idea: ω is not mysterious, it is the slope of θ(t). At an extreme position the pendulum stops for an instant, so ω is near zero; near the center it moves fastest, so |ω| is maximum. The phase portrait puts θ and ω together in one drawing: the state of the pendulum. As we will see later, large oscillations are where the nonlinearity of the pendulum becomes visible; small oscillations return to the almost elliptical portrait of the linear pendulum.',
          resources:[{label:'Open Phase portrait',tab:'post',panel:'phase'}]
        },
        {
          id:'model',
          requiresValidation:true,
          title:'Physical model',
          kicker:'Step 4',
          subtitle:'Build the equations of motion from rotational mechanics.',
          intro:[
            'This step is meant for paper, or for the board. The guide asks the right questions, but the final equations should come from the students. We will use the constitutive and structural equations of rotational mechanics.',
            'In translational systems we use position, velocity, and acceleration. In rotational systems we use the angle θ, the angular velocity ω, and the angular acceleration α:',
            {math:String.raw`\dot{x}=v,\qquad \dot{v}=a`},
            {math:String.raw`\dot{\theta}=\omega,\qquad \dot{\omega}=\alpha`},
            'In translation, mass is the inertia that resists changes in linear motion. In rotation, the corresponding quantity is the moment of inertia. For a point mass rotating at distance L from an axis, as if it were attached to a massless rigid rod:',
            {math:String.raw`J=mL^2`},
            'Newton’s second law also has a rotational version. In translation:',
            {math:String.raw`\sum F = ma`},
            'In rotation, the sum of moments equals moment of inertia times angular acceleration:',
            {math:String.raw`\sum M = J\alpha = J\dot{\omega}`},
            'A torque, also called a moment, is the rotational effect of a force with respect to a chosen point or axis. Given a point and a force, there are two equivalent ways to compute it.',
            'First option: draw the line along which the force acts, measure the shortest distance from the chosen point to that line, and multiply distance by force.',
            {math:String.raw`M = d_{\perp}F`},
            'Second option: decompose the force into a collinear component and a tangential component. Only the tangential component produces rotation.',
            {math:String.raw`M = L F_{\mathrm{tan}}`},
            'In both methods, geometry enters the problem. For the pendulum, that means we cannot avoid trigonometric functions.',
            'We also need a viscous force, which opposes motion. In translation we often write:',
            {math:String.raw`F_b=-b\,v`},
            'Here we use the rotational version, with b in N·m·s/rad:',
            {math:String.raw`M_b=-b\,\omega`},
            'For this pendulum, the mechanical actions to consider are gravity and viscous damping.'
          ],
          instructions:[
            'Write the differential equations that describe the system.',
            {html:'Use this notation:<div class="tp-notation"><div><span class="tp-symbol">L</span>: pendulum length, distance from the rotation axis to the point mass (m).</div><div><span class="tp-symbol">g</span>: gravitational acceleration, <strong>9.8 m/s²</strong>.</div><div><span class="tp-symbol">m</span>: point mass (kg).</div><div><span class="tp-symbol">b</span>: rotational viscous friction coefficient, in <strong>N·m·s/rad</strong>.</div><div><span class="tp-symbol">θ(t)</span>: angle between the vertical and the pendulum, positive counterclockwise (rad).</div><div><span class="tp-symbol">ω(t)</span>: angular velocity (rad/s).</div></div>'},
            'If you obtain a second-order equation, convert it into two first-order equations. We already saw that in class.',
            'Write the result in vector form, using the state vector.',
            'Do not forget the initial conditions: a dynamic model without initial conditions is not ready to simulate.'
          ],
          questions:[
            {type:'qcm',id:'model_states',label:'Which variables are the states of the pendulum model?',options:[
              ['theta_omega','θ and ω.'],
              ['torque_omega','Torque and ω.'],
              ['torque_theta','Torque and θ.'],
              ['xy','x and y position of the mass.']
            ],answer:'theta_omega'},
            {type:'qcm',id:'matrix_form',label:'Can the complete nonlinear pendulum be written directly as dx/dt = A x + B u with constant matrices A and B?',options:[
              ['yes_always','Yes, every mechanical system can be written that way.'],
              ['yes_state','Yes, as soon as we choose θ and ω as states.'],
              ['no_sin','No, because the gravity term contains a nonlinear dependence on θ.'],
              ['no_damping','Only no, because damping is present.']
            ],answer:'no_sin'},
            {type:'qcm',id:'initial_conditions',label:'Which initial conditions are needed for the first-order state model?',options:[
              ['theta_only','Only θ(0), because ω(0) can be calculated by differentiating θ(0).'],
              ['torque_theta','Initial torque and θ(0).'],
              ['xy','The x,y position of the mass.'],
              ['theta_omega','θ(0) and ω(0).']
            ],answer:'theta_omega'},
          ],
          checklist:[
            {id:'model_first_order_done',label:'I obtained the system of first-order differential equations.'},
            {id:'model_vector_form_done',label:'I wrote the equations in vector form.'},
            {id:'model_initial_conditions_done',label:'I understood how many initial conditions are needed, and which ones.'}
          ],
          success:'Correct. You have identified the state variables, the role of the initial conditions, and why the full pendulum is not automatically a linear matrix model. You now have the ingredients needed to write a dynamic model that can be simulated.',
          resources:[]
        },
        {
          id:'modelica',
          requiresValidation:true,
          title:'Modelica simulation',
          kicker:'Step 5',
          subtitle:'Use the equations you just developed in a Modelica model.',
          instructions:[
            {html:'We will use the equations we just developed to simulate the system in <strong class="tp-highlight">OpenModelica</strong>.'},
            'Remember: Modelica is a modelling language, and OpenModelica is free software that simulates models written in that language.',
            'First we need to write our model. Below is a model skeleton: complete only the missing equations.',
            {html:'Copy this text into OpenModelica and run the simulation.'},
            {html:'To visualize the results more clearly, use the OpenModelica viewer.'}
          ],
          code:MODEL_CODE,
          codeLarge:true,
          questions:[
            {type:'qcm',id:'modelica_der_theta',label:'In the Modelica skeleton, what does der(theta) represent?',options:[
              ['alpha','The angular acceleration alpha.'],
              ['omega','The angular velocity omega.'],
              ['theta0','The initial condition theta(0).'],
              ['torque','The total torque applied to the pendulum.']
            ],answer:'omega'},
            {type:'qcm',id:'modelica_omega_algorithm',label:'Does Modelica use the numerical algorithm from step 3 to calculate omega from theta(t)?',options:[
              ['no_diff_eq','No. By solving the model differential equations, it obtains theta and omega simultaneously.'],
              ['yes_post_derivative','Yes. Modelica first calculates theta(t), then applies the same numerical derivative algorithm used in step 3.']
            ],answer:'no_diff_eq'},
            {type:'qcm',id:'modelica_der_omega',label:'In der(omega), which term represents the effect of gravity?',options:[
              ['theta_dot','A term proportional to der(theta).'],
              ['time','A term that depends directly on time.'],
              ['sin_theta','A term proportional to sin(theta).'],
              ['constant_mass','A constant term equal to m.']
            ],answer:'sin_theta'},
            {type:'qcm',id:'modelica_damping_b',label:'If you compare a simulation with b = 0 and another with b > 0, what main difference should you see in the viewer?',options:[
              ['damped_decay','With b > 0, the amplitude of theta(t) and omega(t) decreases over time; with b = 0, the ideal oscillation keeps its amplitude.'],
              ['amplitude_grows','With b > 0, the amplitude increases over time; with b = 0, the pendulum stops faster.'],
              ['adds_noise','With b > 0, the curves become irregular because damping adds experimental noise to the simulation.']
            ],answer:'damped_decay'}
          ],
          success:'Correct. You can now write the two missing equations in the Modelica skeleton, simulate the model in OpenModelica, and inspect the curves with the viewer.',
          resources:[
            {label:'Open OpenModelica viewer',href:'./../openmodelica-viewer/index.html'}
          ]
        }
      ]
    },

    FR:{
      ui:{
        tab:'Guides TP',
        progress:'Progression du TP',
        reset:'Réinitialiser',
        export:'Exporter les réponses',
        exportTitle:'TP pendule - réponses de validation',
        exportDate:'Date et heure',
        exportStep:'Étape',
        exportStatus:'État de l’étape',
        exportValidated:'validée',
        exportNotValidated:'non validée',
        exportQuestions:'Questions',
        exportChosen:'Réponse choisie',
        exportNoAnswer:'(sans réponse)',
        prev:'Étape précédente',
        validate:'Valider l’étape',
        next:'Étape suivante',
        fallbackKicker:'Parcours autonome',
        fallbackTitle:'TP pendule',
        fallbackSubtitle:'Chaque étape débloque la suivante. Répondez, validez, puis utilisez les outils de mesure, de simulation et d’analyse.',
        intro:'Introduction',
        mission:'Mission',
        questions:'Questions et validation',
        tools:'Outils',
        checklist:'Avant de continuer',
        copy:'Copier',
        copied:'Code copié dans le presse-papiers.',
        copyFailed:'Impossible de copier automatiquement. Sélectionnez le bloc de code manuellement.',
        qcmWarn:'Revoyez la question QCM avant de valider cette étape.',
        textWarn:'La réponse ouverte est encore trop courte pour valider cette étape.',
        numberWarn:'Renseignez une valeur numérique valide.',
        minWarn:'La valeur numérique semble trop petite.',
        maxWarn:'La valeur numérique semble trop grande.',
        checklistWarn:'Cochez tous les points avant de valider cette étape.',
        valid:'Étape validée. La suite est débloquée.',
        resetConfirm:'Réinitialiser le parcours TP sur ce navigateur ?',
        resetTitle:'Réinitialiser le TP ?',
        resetBody:'Cela effacera la progression et les réponses enregistrées dans ce navigateur.',
        resetCancel:'Annuler',
        resetOk:'Réinitialiser',
        done:'OK',
        locked:'LOCK'
      },
      steps:[
        {
          id:'real-first',
          title:'Mesures réelles',
          kicker:'Étape 1',
          subtitle:'Commencez par le pendule réel : observez avant de modéliser.',
          instructions:[
            {html:'Placez le bord extérieur de la masse coulissante à <strong class="tp-highlight">30 cm</strong> du centre de l’axe de rotation.'},
            'Connectez le câble USB et lancez l’acquisition.',
            'Placez le pendule avec une condition initiale proche de 180 degrés, de sorte qu’il retombe du même côté que celui par lequel il a été levé, sans faire un tour complet.',
            'Relâchez-le sans lui donner de vitesse initiale avec la main : lâchez-le sans le pousser.',
            'Poursuivez l’acquisition jusqu’à ce que l’amplitude d’oscillation soit d’environ 5 degrés.'
          ],
          questions:[],
          checklist:[
            {id:'real_mass_30cm',label:'J’ai placé la masse à 30 cm.'},
            {id:'real_usb_connected',label:'J’ai connecté le câble USB au pendule, s’il n’était pas déjà connecté.'},
            {id:'real_acquisition_180',label:'J’ai lancé une acquisition avec le pendule presque à 180 degrés et sans vitesse initiale.'},
            {id:'real_csv_saved',label:'J’ai sauvegardé le résultat en CSV et noté le nom du fichier.'},
            {id:'real_csv_emailed',label:'Je me suis envoyé le CSV par email pour pouvoir l’utiliser un autre jour, dans la partie 2 de ce TP.'}
          ],
          resources:[{label:'Ouvrir Acquisition',tab:'acq'}]
        },
        {
          id:'period-real',
          requiresValidation:true,
          title:'Période expérimentale',
          kicker:'Étape 2',
          subtitle:'Observez comment la période évolue pendant l’oscillation.',
          instructions:[
            'Ouvrez l’analyse Période vs temps et lancez-la sur le CSV enregistré à l’étape 1.',
            'Regardez comment la période d’oscillation évolue cycle par cycle pendant que le pendule perd de l’amplitude.',
            'À grande amplitude, le pendule n’est pas parfaitement isochrone ; à petite amplitude, la période devient presque constante.'
          ],
          questions:[
            {type:'qcm',id:'period_evolution',label:'Sur le graphe Période vs temps, la période semble...',options:[
              ['constant','constante dès le début.'],
              ['increasing','croissante au cours du temps.'],
              ['decreasing','décroissante, puis de plus en plus proche d’une valeur stable.']
            ],answer:'decreasing'},
            {type:'qcm',id:'period_asymptotic',label:'La période semble-t-elle tendre vers une valeur limite ?',options:[
              ['yes_asymptotic','Oui, elle semble asymptotique vers une valeur presque constante.'],
              ['no_asymptotic','Non, elle continue à dériver sans se stabiliser.'],
              ['random','Non, elle est aléatoire d’une oscillation à l’autre.']
            ],answer:'yes_asymptotic'}
          ],
          success:'Correct ! C’est précisément pour cela qu’un pendule peut servir d’horloge : à petites oscillations, la période devient presque constante. Les grandes oscillations font le spectacle ; les petites gardent le temps. Galilée aurait sûrement souri.',
          resources:[{label:'Ouvrir Période vs temps',tab:'post',panel:'period'}]
        },
        {
          id:'phase',
          requiresValidation:true,
          title:'Portrait de phase',
          kicker:'Étape 3',
          subtitle:'Passez de θ(t) au vecteur d’état.',
          intro:[
            {html:'Jusqu’ici, nous avons surtout regardé <strong>θ(t)</strong> (theta) : l’angle du pendule au cours du temps. Mais l’état mécanique ne se résume pas à la position du pendule ; il faut aussi savoir à quelle vitesse il se déplace et dans quel sens. Cette deuxième variable est <strong>ω(t)</strong> (omega), la vitesse angulaire.'},
            {html:'Le capteur mesure <strong>θ(t)</strong>. Il ne mesure pas directement <strong>ω(t)</strong>. L’application estime <strong>ω(t)</strong> en calculant la pente de <strong>θ(t)</strong> :'},
            {math:String.raw`\omega(t)=\frac{d\theta(t)}{dt}`},
            {html:'Les données sont échantillonnées. Si <strong>θ[i]</strong> est l’angle mesuré à l’échantillon <strong>i</strong>, alors l’indice <strong>i</strong> correspond au temps :'},
            {math:String.raw`t_i=T\,i,\qquad T=0.02\,\mathrm{s}`},
            'Ici, T est la période d’échantillonnage du signal continu. Une estimation simple par différence centrée est :',
            {math:String.raw`\hat{\omega}[i]=\frac{\theta[i+1]-\theta[i-1]}{2T}`},
            {html:'Le petit chapeau est important. On écrit <strong>ω hat</strong>, ou <strong>ω̂</strong>, parce que ce n’est pas la vraie dérivée <strong>ω(t)</strong> ; c’est une estimation calculée à partir des échantillons. Écrire seulement <strong>ω</strong> voudrait dire la vitesse angulaire exacte, et ici on ne la mesure pas directement.'},
            {html:'On peut imaginer un petit triangle tracé sur la courbe <strong>θ(t)</strong>, entre les points <strong>i - 1</strong> et <strong>i + 1</strong>. La dérivée est simplement la pente de ce triangle : <strong>ΔY/ΔX</strong>. Dans la définition mathématique, <strong>ΔX</strong> tend vers zéro ; avec des données échantillonnées, <strong>ΔX</strong> reste fini, donc on estime la pente avec des échantillons voisins.'},
            {html:'Wait a minute... si on est à l’échantillon <strong>i</strong>, alors l’échantillon <strong>i + 1</strong> n’a pas encore eu lieu à cet instant. Comment l’application peut-elle utiliser une donnée qui vient « après » ? Cette recette exacte ne pourrait pas être utilisée telle quelle par un contrôleur en temps réel qui doit réagir maintenant, car certains échantillons ne sont pas encore arrivés. Ici, ce n’est pas un problème : on analyse après l’expérience. Le signal a déjà eu lieu et il est stocké, donc l’application peut le parcourir en arrière et en avant.'},
            {modal:'omegaAdvanced',labelHtml:'Comment l’application calcule-t-elle&nbsp;<strong>ω</strong>&nbsp;en pratique ?'}
          ],
          instructions:[
            {html:'Ouvrez l’analyse Portrait de phase. Comparez d’abord <strong>θ(t)</strong> et <strong>ω(t)</strong> dans le temps. Regardez ensuite le plan <strong>(θ, ω)</strong> : chaque point représente l’état instantané du pendule.'},
            'Utilisez le zoom pour comparer deux zones : grandes oscillations au début, puis petites oscillations plus tard. Le changement de forme raconte la physique.'
          ],
          questions:[
            {type:'qcm',id:'theta_omega_sync',label:'En comparant θ(t) et ω(t), qu’observe-t-on ?',options:[
              ['same_max','θ et ω atteignent leurs maxima au même moment.'],
              ['derivative','Quand θ est maximal ou minimal, ω est proche de zéro ; quand θ passe par zéro, |ω| est maximal.'],
              ['omega_max_theta_max','ω est maximale quand θ est maximal.'],
              ['unrelated','ω n’a pas de relation claire avec θ.']
            ],answer:'derivative'},
            {type:'qcm',id:'high_time_shape',label:'À grandes oscillations, les signaux temporels semblent...',options:[
              ['perfect_sine','parfaitement sinusoïdaux pour θ(t) et ω(t).'],
              ['random','aléatoires d’une oscillation à l’autre.'],
              ['deformed','déformés par rapport à une sinusoïde idéale : θ(t) est plus aplatie près des extrema et ω(t) plus pointue.'],
              ['square','carrés, comme un signal numérique.']
            ],answer:'deformed'},
            {type:'qcm',id:'low_time_shape',label:'À petites oscillations, θ(t) et ω(t) ressemblent plutôt à...',options:[
              ['unrelated','deux signaux sans relation.'],
              ['same_max','deux signaux dont les maxima arrivent au même moment.'],
              ['triangle_square','un signal triangulaire et un signal carré.'],
              ['shifted_sines','deux signaux presque sinusoïdaux, décalés dans le temps.']
            ],answer:'shifted_sines'},
            {type:'qcm',id:'phase_shape_compare',label:'En comparant le portrait de phase à grandes et petites oscillations, que voit-on ?',options:[
              ['ellipse_both','Dans les deux cas, c’est une ellipse parfaite.'],
              ['line_both','Dans les deux cas, c’est une droite.'],
              ['diamond_ellipse','À grandes oscillations il est déformé, proche d’un losange arrondi ; à petites oscillations il ressemble davantage à une ellipse.'],
              ['small_more_deformed','Les petites oscillations sont plus déformées que les grandes.']
            ],answer:'diamond_ellipse'},
            {type:'qcm',id:'omega_derivative_causality',label:'Utilisons l’idée vue en DS 3.5 : systèmes et signaux. L’algorithme de dérivée utilisé ici regarde i - 2 et i + 2. Comment le classeriez-vous ?',options:[
              ['causal','Causal : il a seulement besoin du présent et du passé.'],
              ['noncausal','Non causal : il utilise un échantillon futur, donc il sert ici au post-traitement d’un signal déjà enregistré.'],
              ['recorded_file','Causal parce que i + 2 se trouve dans le même fichier enregistré.'],
              ['unrelated','La causalité ne s’applique pas aux signaux échantillonnés.']
            ],answer:'noncausal'}
          ],
          success:'Correct. C’est l’idée centrale : ω n’est pas mystérieuse, c’est la pente de θ(t). À une position extrême, le pendule s’arrête un instant, donc ω est proche de zéro ; près du centre, il va le plus vite, donc |ω| est maximal. Le portrait de phase réunit θ et ω dans un seul dessin : l’état du pendule. Comme nous le verrons plus loin, les grandes oscillations sont le domaine où la non-linéarité du pendule devient visible ; les petites oscillations retrouvent le portrait presque elliptique du pendule linéaire.',
          resources:[{label:'Ouvrir Portrait de phase',tab:'post',panel:'phase'}]
        },
        {
          id:'model',
          requiresValidation:true,
          title:'Modèle physique',
          kicker:'Étape 4',
          subtitle:'Construisez les équations du mouvement avec la mécanique rotationnelle.',
          intro:[
            'Cette étape se travaille sur papier, ou au tableau. Le guide pose les bonnes questions, mais les équations finales doivent venir des étudiantes et étudiants. Nous allons utiliser les équations constitutives et structurelles de la mécanique rotationnelle.',
            'Dans les systèmes translationnels, on utilise la position, la vitesse et l’accélération. Dans les systèmes rotationnels, on utilise l’angle θ, la vitesse angulaire ω et l’accélération angulaire α :',
            {math:String.raw`\dot{x}=v,\qquad \dot{v}=a`},
            {math:String.raw`\dot{\theta}=\omega,\qquad \dot{\omega}=\alpha`},
            'En translation, la masse est l’inertie qui s’oppose aux changements du mouvement linéaire. En rotation, la grandeur correspondante est le moment d’inertie. Pour une masse ponctuelle qui tourne à une distance L d’un axe, comme si elle était fixée à une tige rigide sans masse :',
            {math:String.raw`J=mL^2`},
            'La deuxième loi de Newton possède aussi une version rotationnelle. En translation :',
            {math:String.raw`\sum F = ma`},
            'En rotation, la somme des moments est égale au moment d’inertie fois l’accélération angulaire :',
            {math:String.raw`\sum M = J\alpha = J\dot{\omega}`},
            'Un couple, ou moment, est l’effet rotationnel d’une force par rapport à un point ou à un axe choisi. Étant donnés un point et une force, il y a deux façons équivalentes de le calculer.',
            'Première option : tracer la droite sur laquelle agit la force, mesurer la distance minimale entre le point choisi et cette droite, puis multiplier distance par force.',
            {math:String.raw`M = d_{\perp}F`},
            'Deuxième option : décomposer la force en une composante colinéaire et une composante tangentielle. Seule la composante tangentielle produit une rotation.',
            {math:String.raw`M = L F_{\mathrm{tan}}`},
            'Dans les deux méthodes, la géométrie entre dans le problème. Pour le pendule, cela veut dire qu’on ne peut pas éviter les fonctions trigonométriques.',
            'Il faut aussi introduire une force visqueuse, qui s’oppose au mouvement. En translation, on écrit souvent :',
            {math:String.raw`F_b=-b\,v`},
            'Ici, on utilise la version rotationnelle, avec b en N·m·s/rad :',
            {math:String.raw`M_b=-b\,\omega`},
            'Pour ce pendule, les actions mécaniques à prendre en compte sont la gravité et l’amortissement visqueux.'
          ],
          instructions:[
            'Écrivez les équations différentielles qui décrivent le système.',
            {html:'Utilisez cette notation :<div class="tp-notation"><div><span class="tp-symbol">L</span> : longueur du pendule, distance entre l’axe de rotation et la masse ponctuelle (m).</div><div><span class="tp-symbol">g</span> : accélération de la gravité, <strong>9,8 m/s²</strong>.</div><div><span class="tp-symbol">m</span> : masse ponctuelle (kg).</div><div><span class="tp-symbol">b</span> : coefficient de frottement visqueux rotationnel, en <strong>N·m·s/rad</strong>.</div><div><span class="tp-symbol">θ(t)</span> : angle entre la verticale et le pendule, positif dans le sens antihoraire (rad).</div><div><span class="tp-symbol">ω(t)</span> : vitesse angulaire (rad/s).</div></div>'},
            'Si vous obtenez une équation du second ordre, transformez-la en deux équations du premier ordre. On l’a déjà vu en cours.',
            'Écrivez le résultat sous forme vectorielle, en utilisant le vecteur d’état.',
            'N’oubliez pas les conditions initiales : un modèle dynamique sans conditions initiales n’est pas prêt à être simulé.'
          ],
          questions:[
            {type:'qcm',id:'model_states',label:'Quelles variables sont les états du modèle du pendule ?',options:[
              ['theta_omega','θ et ω.'],
              ['torque_omega','Le couple et ω.'],
              ['torque_theta','Le couple et θ.'],
              ['xy','La position x,y de la masse.']
            ],answer:'theta_omega'},
            {type:'qcm',id:'matrix_form',label:'Le pendule non linéaire complet peut-il s’écrire directement sous la forme dx/dt = A x + B u, avec A et B constants ?',options:[
              ['yes_always','Oui, tout système mécanique peut s’écrire ainsi.'],
              ['yes_state','Oui, dès qu’on choisit θ et ω comme états.'],
              ['no_sin','Non, car le terme de gravité dépend de θ de façon non linéaire.'],
              ['no_damping','Non uniquement parce qu’il y a de l’amortissement.']
            ],answer:'no_sin'},
            {type:'qcm',id:'initial_conditions',label:'Quelles conditions initiales faut-il pour le modèle d’état du premier ordre ?',options:[
              ['theta_only','Seulement θ(0), car ω(0) peut se calculer en dérivant θ(0).'],
              ['torque_theta','Le couple initial et θ(0).'],
              ['xy','La position x,y de la masse.'],
              ['theta_omega','θ(0) et ω(0).']
            ],answer:'theta_omega'},
          ],
          checklist:[
            {id:'model_first_order_done',label:'J’ai obtenu le système d’équations différentielles du premier ordre.'},
            {id:'model_vector_form_done',label:'J’ai écrit les équations sous forme vectorielle.'},
            {id:'model_initial_conditions_done',label:'J’ai compris combien de conditions initiales il faut, et lesquelles.'}
          ],
          success:'Correct. Vous avez identifié les variables d’état, le rôle des conditions initiales, et pourquoi le pendule complet n’est pas automatiquement un modèle matriciel linéaire. Vous avez maintenant les ingrédients nécessaires pour écrire un modèle dynamique que l’on pourra simuler.',
          resources:[]
        },
        {
          id:'modelica',
          requiresValidation:true,
          title:'Simulation Modelica',
          kicker:'Étape 5',
          subtitle:'Utilisez les équations que vous venez d’établir dans un modèle Modelica.',
          instructions:[
            {html:'Nous allons utiliser les équations que nous venons de développer pour simuler le système dans <strong class="tp-highlight">OpenModelica</strong>.'},
            'Rappel : Modelica est un langage de modélisation, et OpenModelica est un logiciel libre qui simule les modèles écrits dans ce langage.',
            'Nous devons d’abord écrire notre modèle. Voici un squelette de modèle : complétez uniquement les équations manquantes.',
            {html:'Copiez ce texte dans OpenModelica et lancez la simulation.'},
            {html:'Pour mieux visualiser les résultats, utilisez l’outil OpenModelica viewer.'}
          ],
          code:MODEL_CODE,
          codeLarge:true,
          questions:[
            {type:'qcm',id:'modelica_der_theta',label:'Dans le squelette Modelica, que représente der(theta) ?',options:[
              ['alpha','L’accélération angulaire α.'],
              ['omega','La vitesse angulaire ω.'],
              ['theta0','La condition initiale θ(0).'],
              ['torque','Le moment total appliqué au pendule.']
            ],answer:'omega'},
            {type:'qcm',id:'modelica_omega_algorithm',label:'Modelica utilise-t-il l’algorithme numérique de l’étape 3 pour calculer omega à partir de theta(t) ?',options:[
              ['no_diff_eq','Non. En résolvant les équations différentielles du modèle, il obtient simultanément theta et omega.'],
              ['yes_post_derivative','Oui. Modelica calcule d’abord theta(t), puis applique le même algorithme de dérivation numérique que celui de l’étape 3.']
            ],answer:'no_diff_eq'},
            {type:'qcm',id:'modelica_der_omega',label:'Dans der(omega), quel terme traduit l’effet de la gravité ?',options:[
              ['theta_dot','Un terme proportionnel à der(theta).'],
              ['time','Un terme qui dépend directement du temps.'],
              ['sin_theta','Un terme proportionnel à sin(theta).'],
              ['constant_mass','Un terme constant égal à m.']
            ],answer:'sin_theta'},
            {type:'qcm',id:'modelica_damping_b',label:'Si vous comparez une simulation avec b = 0 et une autre avec b > 0, quelle différence principale devriez-vous voir dans le viewer ?',options:[
              ['damped_decay','Avec b > 0, l’amplitude de theta(t) et omega(t) diminue au cours du temps ; avec b = 0, l’oscillation idéale conserve son amplitude.'],
              ['amplitude_grows','Avec b > 0, l’amplitude augmente au cours du temps ; avec b = 0, le pendule s’arrête plus vite.'],
              ['adds_noise','Avec b > 0, les courbes deviennent irrégulières, car l’amortissement ajoute du bruit expérimental à la simulation.']
            ],answer:'damped_decay'}
          ],
          success:{html:'Correct. Vous pouvez maintenant écrire les deux équations manquantes dans le squelette <strong>Modelica</strong>, <strong>simuler</strong> le modèle dans <strong>OpenModelica</strong>, puis inspecter les courbes avec le viewer.'},
          resources:[
            {label:'Ouvrir viewer OpenModelica',href:'./../openmodelica-viewer/index.html'}
          ]
        }
      ]
    },

    ES:{
      ui:{
        tab:'Guías TP',
        progress:'Progreso del TP',
        reset:'Reiniciar',
        export:'Exportar respuestas',
        exportTitle:'TP péndulo - respuestas de validación',
        exportDate:'Fecha y hora',
        exportStep:'Paso',
        exportStatus:'Estado del paso',
        exportValidated:'validado',
        exportNotValidated:'no validado',
        exportQuestions:'Preguntas',
        exportChosen:'Respuesta elegida',
        exportNoAnswer:'(sin respuesta)',
        prev:'Paso anterior',
        validate:'Validar paso',
        next:'Paso siguiente',
        fallbackKicker:'Guía autónoma',
        fallbackTitle:'TP de péndulo',
        fallbackSubtitle:'Cada paso habilita el siguiente. Respondé, validá y luego usá las herramientas de medición, simulación y análisis.',
        intro:'Introducción',
        mission:'Misión',
        questions:'Preguntas y validación',
        tools:'Herramientas',
        checklist:'Antes de seguir',
        copy:'Copiar',
        copied:'Código copiado al portapapeles.',
        copyFailed:'No se pudo copiar automáticamente. Seleccioná el bloque de código manualmente.',
        qcmWarn:'Revisá la pregunta de opción múltiple antes de validar este paso.',
        textWarn:'La respuesta abierta todavía es demasiado corta para validar este paso.',
        numberWarn:'Ingresá un valor numérico válido.',
        minWarn:'El valor numérico parece demasiado pequeño.',
        maxWarn:'El valor numérico parece demasiado grande.',
        checklistWarn:'Tildá todos los puntos antes de validar este paso.',
        valid:'Paso validado. El siguiente paso queda habilitado.',
        resetConfirm:'¿Reiniciar el progreso del TP en este navegador?',
        resetTitle:'¿Reiniciar la guía TP?',
        resetBody:'Esto va a borrar el progreso y las respuestas guardadas en este navegador.',
        resetCancel:'Cancelar',
        resetOk:'Reiniciar',
        done:'OK',
        locked:'LOCK'
      },
      steps:[
        {
          id:'real-first',
          title:'Medidas reales',
          kicker:'Paso 1',
          subtitle:'Empezá por el péndulo real: observá antes de modelar.',
          instructions:[
            {html:'Ubicá el borde exterior de la masa deslizante a <strong class="tp-highlight">30 cm</strong> del centro del eje que gira.'},
            'Conectá el cable USB y lanzá la adquisición.',
            'Usá una condición inicial casi de 180 grados, de modo que el péndulo caiga del mismo lado desde donde lo subiste y no dé una vuelta completa.',
            'Soltalo sin darle velocidad inicial con la mano: dejalo caer sin empujarlo.',
            'Adquirí hasta que la amplitud de oscilación sea de aproximadamente 5 grados.'
          ],
          questions:[],
          checklist:[
            {id:'real_mass_30cm',label:'Coloqué la masa a 30 cm.'},
            {id:'real_usb_connected',label:'Conecté el cable USB al péndulo, si todavía no estaba conectado.'},
            {id:'real_acquisition_180',label:'Lancé una adquisición, con el péndulo a casi 180 grados y sin velocidad inicial.'},
            {id:'real_csv_saved',label:'Guardé el resultado en un CSV y anoté el nombre del archivo.'},
            {id:'real_csv_emailed',label:'Me envié el CSV por email para poder usarlo otro día, en la parte 2 de este TP.'}
          ],
          resources:[{label:'Abrir Adquisición',tab:'acq'}]
        },
        {
          id:'period-real',
          requiresValidation:true,
          title:'Período experimental',
          kicker:'Paso 2',
          subtitle:'Observá cómo evoluciona el período durante la oscilación.',
          instructions:[
            'Abrí el análisis Período vs tiempo y lanzalo sobre el CSV registrado en el paso 1.',
            'Mirá cómo evoluciona el período de la oscilación ciclo a ciclo mientras el péndulo pierde amplitud.',
            'A gran amplitud el péndulo no es perfectamente isócrono; a baja amplitud, el período se vuelve casi constante.'
          ],
          questions:[
            {type:'qcm',id:'period_evolution',label:'En el gráfico Período vs tiempo, el período parece...',options:[
              ['constant','constante desde el principio.'],
              ['increasing','creciente a medida que pasa el tiempo.'],
              ['decreasing','decreciente, y luego cada vez más cerca de un valor estable.']
            ],answer:'decreasing'},
            {type:'qcm',id:'period_asymptotic',label:'¿El período parece tender hacia un valor límite?',options:[
              ['yes_asymptotic','Sí, parece asintótico hacia un valor casi constante.'],
              ['no_asymptotic','No, sigue cambiando sin estabilizarse.'],
              ['random','No, es aleatorio de una oscilación a la siguiente.']
            ],answer:'yes_asymptotic'}
          ],
          success:'¡Correcto! Por eso un péndulo puede funcionar como reloj: a bajas oscilaciones, el período se vuelve casi constante. Las oscilaciones grandes hacen teatro; las chiquitas llevan el tiempo. Galileo estaría bastante contento con esta curva.',
          resources:[{label:'Abrir Período vs tiempo',tab:'post',panel:'period'}]
        },
        {
          id:'phase',
          requiresValidation:true,
          title:'Retrato de fase',
          kicker:'Paso 3',
          subtitle:'Pasá de θ(t) al vector de estado.',
          intro:[
            {html:'Hasta ahora miramos sobre todo <strong>θ(t)</strong> (theta): el ángulo del péndulo en función del tiempo. Pero el estado mecánico no queda definido solo por dónde está el péndulo; también necesitamos saber qué tan rápido se mueve y hacia qué lado. Esa segunda variable es <strong>ω(t)</strong> (omega), la velocidad angular.'},
            {html:'El sensor mide <strong>θ(t)</strong>. No mide directamente <strong>ω(t)</strong>. La app estima <strong>ω(t)</strong> calculando la pendiente de <strong>θ(t)</strong>:'},
            {math:String.raw`\omega(t)=\frac{d\theta(t)}{dt}`},
            {html:'Los datos están muestreados. Si <strong>θ[i]</strong> es el ángulo medido en la muestra <strong>i</strong>, entonces el índice <strong>i</strong> corresponde al tiempo:'},
            {math:String.raw`t_i=T\,i,\qquad T=0.02\,\mathrm{s}`},
            'Acá T es el período de muestreo de la señal continua. Una estimación simple por diferencia centrada es:',
            {math:String.raw`\hat{\omega}[i]=\frac{\theta[i+1]-\theta[i-1]}{2T}`},
            {html:'El sombrerito importa. Escribimos <strong>ω hat</strong>, o <strong>ω̂</strong>, porque esto no es la derivada verdadera <strong>ω(t)</strong>; es una estimación calculada a partir de muestras. Escribir solamente <strong>ω</strong> significaría la velocidad angular exacta, y eso acá no se mide directamente.'},
            {html:'Imaginá que dibujamos un pequeño triángulo sobre la curva <strong>θ(t)</strong>, entre los puntos <strong>i - 1</strong> e <strong>i + 1</strong>. La derivada no es más que la pendiente de ese triángulo: <strong>ΔY/ΔX</strong>. En la definición matemática, <strong>ΔX</strong> tiende a cero; en una señal muestreada, <strong>ΔX</strong> es finito, entonces estimamos la pendiente usando muestras vecinas.'},
            {html:'Wait a minute... si estamos en la muestra <strong>i</strong>, entonces la muestra <strong>i + 1</strong> todavía no ocurrió en ese instante. ¿Cómo puede la app usar un dato que viene “después”? Esta receta exacta no se podría usar tal cual en un controlador en tiempo real que tiene que reaccionar ahora, porque algunas muestras todavía no llegaron. Acá no hay problema: estamos analizando después del experimento. La señal ya pasó y quedó guardada, entonces la app puede recorrerla hacia atrás y hacia adelante.'},
            {modal:'omegaAdvanced',labelHtml:'¿Cómo calcula la app&nbsp;<strong>ω</strong>&nbsp;en la práctica?'}
          ],
          instructions:[
            {html:'Abrí el análisis Retrato de fase. Primero compará <strong>θ(t)</strong> y <strong>ω(t)</strong> en el tiempo. Después mirá el plano <strong>(θ, ω)</strong>: cada punto representa el estado instantáneo del péndulo.'},
            'Usá zoom para comparar dos zonas: oscilaciones grandes al inicio y oscilaciones pequeñas más adelante. El cambio de forma es la física hablando.'
          ],
          questions:[
            {type:'qcm',id:'theta_omega_sync',label:'Al comparar θ(t) y ω(t), ¿qué se observa?',options:[
              ['same_max','θ y ω alcanzan sus máximos al mismo tiempo.'],
              ['derivative','Cuando θ es máximo o mínimo, ω está cerca de cero; cuando θ pasa por cero, |ω| es máximo.'],
              ['omega_max_theta_max','ω es máxima cuando θ es máxima.'],
              ['unrelated','ω no tiene relación clara con θ.']
            ],answer:'derivative'},
            {type:'qcm',id:'high_time_shape',label:'A grandes oscilaciones, las señales temporales se ven...',options:[
              ['perfect_sine','perfectamente sinusoidales en θ(t) y ω(t).'],
              ['random','aleatorias de una oscilación a la siguiente.'],
              ['deformed','deformadas respecto de una sinusoide ideal: θ(t) se aplana cerca de los extremos y ω(t) se vuelve más puntiaguda.'],
              ['square','cuadradas, como una señal digital.']
            ],answer:'deformed'},
            {type:'qcm',id:'low_time_shape',label:'A pequeñas oscilaciones, θ(t) y ω(t) se parecen más a...',options:[
              ['unrelated','dos señales sin relación.'],
              ['same_max','dos señales con máximos al mismo tiempo.'],
              ['triangle_square','una señal triangular y una señal cuadrada.'],
              ['shifted_sines','dos señales casi sinusoidales, desfasadas entre sí.']
            ],answer:'shifted_sines'},
            {type:'qcm',id:'phase_shape_compare',label:'Al comparar el retrato de fase a grandes y pequeñas oscilaciones, ¿qué cambia?',options:[
              ['ellipse_both','En ambos casos es una elipse perfecta.'],
              ['line_both','En ambos casos es una línea recta.'],
              ['diamond_ellipse','A grandes oscilaciones se deforma y se parece más a un rombo redondeado; a pequeñas oscilaciones se parece más a una elipse.'],
              ['small_more_deformed','A pequeñas oscilaciones se vuelve más deformado que a grandes oscilaciones.']
            ],answer:'diamond_ellipse'},
            {type:'qcm',id:'omega_derivative_causality',label:'Usemos una idea vista en DS 3.5: teoría de sistemas y señales. El algoritmo de derivada usado acá mira i - 2 e i + 2. ¿Cómo lo clasificarías?',options:[
              ['causal','Causal: solo necesita el presente y el pasado.'],
              ['noncausal','No causal: usa una muestra futura, por eso sirve acá para post-procesar una señal ya guardada.'],
              ['recorded_file','Causal porque i + 2 está en el mismo archivo de datos.'],
              ['unrelated','La causalidad no se aplica a señales muestreadas.']
            ],answer:'noncausal'}
          ],
          success:'Correcto. Esta es la idea central: ω no es una señal misteriosa, es la pendiente de θ(t). Cuando el péndulo está en un extremo, se detiene un instante y ω está cerca de cero; cuando pasa por el centro, va lo más rápido posible y |ω| es máximo. El retrato de fase junta θ y ω en un solo dibujo: el estado del péndulo. Como veremos más adelante, las grandes oscilaciones son donde se vuelve visible la no linealidad del péndulo; a pequeñas oscilaciones vuelve la elipse casi ideal del péndulo lineal.',
          resources:[{label:'Abrir Retrato de fase',tab:'post',panel:'phase'}]
        },
        {
          id:'model',
          requiresValidation:true,
          title:'Modelo físico',
          kicker:'Paso 4',
          subtitle:'Construí las ecuaciones de movimiento con mecánica rotacional.',
          intro:[
            'Esta etapa se trabaja en papel, o en el pizarrón. La guía hace preguntas, pero las ecuaciones finales tienen que salir de los estudiantes. Vamos a usar las ecuaciones constitutivas y estructurales de la mecánica rotacional.',
            'En los sistemas traslacionales usamos posición, velocidad y aceleración. En los sistemas rotacionales usamos el ángulo θ, la velocidad angular ω y la aceleración angular α:',
            {math:String.raw`\dot{x}=v,\qquad \dot{v}=a`},
            {math:String.raw`\dot{\theta}=\omega,\qquad \dot{\omega}=\alpha`},
            'En traslación, la masa es la inercia que se opone a los cambios del movimiento lineal. En rotación, la magnitud equivalente es el momento de inercia. Para una masa puntual que gira a una distancia L de un eje, como si estuviera sujeta a una varilla rígida sin peso propio:',
            {math:String.raw`J=mL^2`},
            'La segunda ley de Newton también tiene una versión rotacional. En traslación:',
            {math:String.raw`\sum F = ma`},
            'En rotación, la suma de momentos es igual al momento de inercia por la aceleración angular:',
            {math:String.raw`\sum M = J\alpha = J\dot{\omega}`},
            'Un torque, o momento, es el efecto rotacional de una fuerza respecto de un punto o eje elegido. Dados un punto y una fuerza, hay dos formas equivalentes de calcularlo.',
            'Primera opción: trazar la recta por la que pasa la fuerza, medir la distancia mínima entre el punto elegido y esa recta, y multiplicar distancia por fuerza.',
            {math:String.raw`M = d_{\perp}F`},
            'Segunda opción: descomponer la fuerza en una componente colineal y una componente tangencial. Solo la componente tangencial produce rotación.',
            {math:String.raw`M = L F_{\mathrm{tan}}`},
            'En cualquiera de los dos métodos entra la geometría. Para el péndulo, eso significa que no nos salvamos de usar funciones trigonométricas.',
            'También necesitamos introducir una fuerza viscosa, que se opone al movimiento. En traslación solemos escribir:',
            {math:String.raw`F_b=-b\,v`},
            'Acá usamos la versión rotacional, con b en N·m·s/rad:',
            {math:String.raw`M_b=-b\,\omega`},
            'Para este péndulo, las acciones mecánicas que hay que considerar son la gravedad y el amortiguamiento viscoso.'
          ],
          instructions:[
            'Escribí las ecuaciones diferenciales que describen el sistema.',
            {html:'Usá esta notación:<div class="tp-notation"><div><span class="tp-symbol">L</span>: longitud del péndulo, distancia entre el eje de rotación y la masa puntual (m).</div><div><span class="tp-symbol">g</span>: gravedad, <strong>9.8 m/s²</strong>.</div><div><span class="tp-symbol">m</span>: masa puntual (kg).</div><div><span class="tp-symbol">b</span>: coeficiente de roce viscoso rotacional, en <strong>N·m·s/rad</strong>.</div><div><span class="tp-symbol">θ(t)</span>: ángulo entre la vertical y el péndulo, positivo en sentido antihorario (rad).</div><div><span class="tp-symbol">ω(t)</span>: velocidad angular (rad/s).</div></div>'},
            'Si llegás a una ecuación de segundo orden, convertila en dos ecuaciones de primer orden. Ya lo vimos en clase.',
            'Escribí el resultado en forma vectorial, usando el vector de estado.',
            'No te olvides de las condiciones iniciales: un modelo dinámico sin condiciones iniciales todavía no está listo para simular.'
          ],
          questions:[
            {type:'qcm',id:'model_states',label:'¿Cuáles son los estados del modelo del péndulo?',options:[
              ['theta_omega','θ y ω.'],
              ['torque_omega','Torque y ω.'],
              ['torque_theta','Torque y θ.'],
              ['xy','La posición x,y de la masa.']
            ],answer:'theta_omega'},
            {type:'qcm',id:'matrix_form',label:'¿El péndulo no lineal completo se puede escribir directamente como dx/dt = A x + B u, con A y B constantes?',options:[
              ['yes_always','Sí, todo sistema mecánico se puede escribir así.'],
              ['yes_state','Sí, apenas elegimos θ y ω como estados.'],
              ['no_sin','No, porque el término de gravedad depende de θ de manera no lineal.'],
              ['no_damping','No solamente porque hay amortiguamiento.']
            ],answer:'no_sin'},
            {type:'qcm',id:'initial_conditions',label:'¿Qué condiciones iniciales hacen falta para el modelo de estado de primer orden?',options:[
              ['theta_only','Solo θ(0), porque ω(0) se puede calcular derivando θ(0).'],
              ['torque_theta','Torque inicial y θ(0).'],
              ['xy','La posición x,y de la masa.'],
              ['theta_omega','θ(0) y ω(0).']
            ],answer:'theta_omega'},
          ],
          checklist:[
            {id:'model_first_order_done',label:'Obtuve el sistema de ecuaciones diferenciales de primer orden.'},
            {id:'model_vector_form_done',label:'Escribí las ecuaciones en forma vectorial.'},
            {id:'model_initial_conditions_done',label:'Entendí cuántas condiciones iniciales necesito, y cuáles son.'}
          ],
          success:'Correcto. Identificaste las variables de estado, el rol de las condiciones iniciales y por qué el péndulo completo no es automáticamente un modelo matricial lineal. Ahora tenés los ingredientes necesarios para escribir un modelo dinámico que después podremos simular.',
          resources:[]
        },
        {
          id:'modelica',
          requiresValidation:true,
          title:'Simulación Modelica',
          kicker:'Paso 5',
          subtitle:'Usá las ecuaciones que acabamos de desarrollar en un modelo Modelica.',
          instructions:[
            {html:'Vamos a utilizar las ecuaciones que acabamos de desarrollar para simular el sistema en <strong class="tp-highlight">OpenModelica</strong>.'},
            'Recordá que Modelica es un lenguaje de modelización, y OpenModelica es un software libre que simula los modelos hechos en dicho lenguaje.',
            'Primero tenemos que escribir nuestro modelo. Acá abajo se encuentra un esqueleto del modelo: solo debés completar las ecuaciones que faltan.',
            {html:'Copiá este texto en OpenModelica y simulá.'},
            {html:'Para visualizar mejor los resultados, usá la herramienta OpenModelica viewer.'}
          ],
          code:MODEL_CODE,
          codeLarge:true,
          questions:[
            {type:'qcm',id:'modelica_der_theta',label:'En el esqueleto Modelica, ¿qué representa der(theta)?',options:[
              ['alpha','La aceleración angular α.'],
              ['omega','La velocidad angular ω.'],
              ['theta0','La condición inicial θ(0).'],
              ['torque','El torque total aplicado al péndulo.']
            ],answer:'omega'},
            {type:'qcm',id:'modelica_omega_algorithm',label:'¿Modelica usa el algoritmo numérico de la etapa 3 para calcular omega a partir de theta(t)?',options:[
              ['no_diff_eq','No. Al resolver las ecuaciones diferenciales del modelo, obtiene simultáneamente theta y omega.'],
              ['yes_post_derivative','Sí. Modelica primero calcula theta(t) y luego aplica el mismo algoritmo de derivación numérica usado en la etapa 3.']
            ],answer:'no_diff_eq'},
            {type:'qcm',id:'modelica_der_omega',label:'En der(omega), ¿qué término representa el efecto de la gravedad?',options:[
              ['theta_dot','Un término proporcional a der(theta).'],
              ['time','Un término que depende directamente del tiempo.'],
              ['sin_theta','Un término proporcional a sin(theta).'],
              ['constant_mass','Un término constante igual a m.']
            ],answer:'sin_theta'},
            {type:'qcm',id:'modelica_damping_b',label:'Si comparás una simulación con b = 0 y otra con b > 0, ¿qué diferencia principal deberías ver en el viewer?',options:[
              ['damped_decay','Con b > 0, la amplitud de theta(t) y omega(t) disminuye con el tiempo; con b = 0, la oscilación ideal conserva su amplitud.'],
              ['amplitude_grows','Con b > 0, la amplitud aumenta con el tiempo; con b = 0, el péndulo se detiene más rápido.'],
              ['adds_noise','Con b > 0, las curvas se vuelven irregulares, porque el amortiguamiento agrega ruido experimental a la simulación.']
            ],answer:'damped_decay'}
          ],
          success:'Correcto. Ahora podés escribir las dos ecuaciones que faltan en el esqueleto Modelica, simular el modelo en OpenModelica y mirar las curvas con el viewer.',
          resources:[
            {label:'Abrir OpenModelica viewer',href:'./../openmodelica-viewer/index.html'}
          ]
        }
      ]
    }
  };

  let tpState={active:0,unlocked:0,completed:{},answers:{}};
  let switchTab=function(){};
  let getLang=function(){return document.documentElement.lang||'EN';};
  let initialized=false;
  let forcedLang=null;

  function normalizeLang(l){
    const code=String(l||'EN').slice(0,2).toUpperCase();
    return TP_TEXT[code]?code:'EN';
  }
  function langCode(){return normalizeLang(forcedLang||(getLang&&getLang())||'EN');}
  function text(){return TP_TEXT[langCode()]||TP_TEXT.EN;}
  function steps(){return text().steps;}
  function hasChecklist(step){return !!(step&&step.checklist&&step.checklist.length);}
  function hasQcm(step){return !!(step&&step.questions&&step.questions.some(q=>q.type==='qcm'));}
  function questionComplete(q){
    const val=answerValue(q.id);
    if(q.type==='qcm')return val===q.answer;
    if(q.type==='text')return String(val).trim().length>=(q.min||1);
    if(q.type==='number'){
      const n=parseFloat(val);
      if(!Number.isFinite(n))return false;
      if(q.minValue!==undefined&&n<q.minValue)return false;
      if(q.maxValue!==undefined&&n>q.maxValue)return false;
    }
    return true;
  }
  function questionsComplete(step){
    return !(step&&step.questions&&step.questions.length)||step.questions.every(questionComplete);
  }
  function checklistComplete(step){
    return !hasChecklist(step)||step.checklist.every(item=>answerValue(item.id)===true);
  }
  function isStepComplete(step){
    return !!(step&&tpState.completed[step.id]&&checklistComplete(step)&&questionsComplete(step));
  }
  function isGateStep(step){
    return hasChecklist(step)||!!step.requiresValidation;
  }
  function firstIncompleteGateIndex(stepList){
    if(TP_ALLOW_STEP_SKIP)return -1;
    return stepList.findIndex(s=>isGateStep(s)&&!isStepComplete(s));
  }

  function loadTpState(){
    try{
      const raw=localStorage.getItem(TP_STORAGE_KEY);
      if(raw)tpState={...tpState,...JSON.parse(raw)};
    }catch(_){}
    tpState.completed=tpState.completed||{};
    tpState.answers=tpState.answers||{};
    const max=steps().length-1;
    tpState.active=Math.min(tpState.active||0,max);
    tpState.unlocked=Math.min(tpState.unlocked||0,max);
  }
  function saveTpState(){localStorage.setItem(TP_STORAGE_KEY,JSON.stringify(tpState));}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function highlightTpTerms(v){
    let html=escapeHtml(v);
    const marked=[];
    const protect=regex=>{
      html=html.replace(regex,match=>{
        const token=`%%TPHL${marked.length}%%`;
        marked.push(`<strong class="tp-highlight">${match}</strong>`);
        return token;
      });
    };
    protect(/OpenModelica/g);
    protect(/\bModelica\b/g);
    protect(/modelling language|langage de modélisation|lenguaje de modelización|language de modelisation/gi);
    protect(/free software|logiciel libre|software libre/gi);
    protect(/\bsimulate\b|\bsimulates\b|\bsimuler\b|\bsimule\b|\bsimula\b|\bsimular\b|\bsimulá\b/gi);
    marked.forEach((value,i)=>{html=html.replace(`%%TPHL${i}%%`,value);});
    return html;
  }
  function renderTpMath(tex){
    if(window.katex){
      return katex.renderToString(tex,{displayMode:true,throwOnError:false});
    }
    return escapeHtml(tex);
  }
  function mathBlock(tex){return `<div class="tp-math">${renderTpMath(tex)}</div>`;}
  function instructionHtml(v){
    if(v&&typeof v==='object'){
      if(v.html)return v.html;
      if(v.math)return mathBlock(v.math);
      if(v.modal)return `<button class="tp-explain-btn" type="button" data-tp-modal="${escapeHtml(v.modal)}">${v.labelHtml||escapeHtml(v.label||'More')}</button>`;
    }
    return highlightTpTerms(v);
  }
  function proseHtml(v){
    if(v&&typeof v==='object'){
      if(v.html)return `<div class="tp-intro-item">${v.html}</div>`;
      if(v.math)return mathBlock(v.math);
      if(v.modal)return `<div class="tp-intro-item"><button class="tp-explain-btn" type="button" data-tp-modal="${escapeHtml(v.modal)}">${v.labelHtml||escapeHtml(v.label||'More')}</button></div>`;
    }
    return `<p>${escapeHtml(v)}</p>`;
  }
  function completedCount(stepList){return stepList.filter(isStepComplete).length;}
  function answerValue(id){return tpState.answers[id]??'';}
  function checklistStepForAnswer(id){
    return steps().find(s=>hasChecklist(s)&&s.checklist.some(item=>item.id===id));
  }
  function setAnswer(id,value){
    tpState.answers[id]=value;
    const checklistStep=checklistStepForAnswer(id);
    if(checklistStep&&!checklistComplete(checklistStep))delete tpState.completed[checklistStep.id];
    const questionStep=steps().find(s=>s.requiresValidation&&(s.questions||[]).some(q=>q.id===id));
    if(questionStep&&!questionsComplete(questionStep))delete tpState.completed[questionStep.id];
    saveTpState();
  }
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}

  function renderTpStaticUi(){
    const ui=text().ui;
    setText('t_tab_tp',ui.tab);
    setText('tpProgressTitle',ui.progress);
    setText('tpResetBtn',ui.reset);
    setText('tpExportBtn',ui.export);
    setText('tpPrevBtn',ui.prev);
    setText('tpValidateBtn',ui.validate);
    setText('tpNextBtn',ui.next);
  }

  function renderTpSidebar(){
    const stepList=steps();
    const ui=text().ui;
    const list=document.getElementById('tpStepList');
    const count=completedCount(stepList);
    const stepGate=firstIncompleteGateIndex(stepList);
    document.getElementById('tpProgressCount').textContent=`${count} / ${stepList.length}`;
    document.getElementById('tpProgressFill').style.width=`${Math.round(count/stepList.length*100)}%`;
    list.innerHTML=stepList.map((s,i)=>{
      const locked=!TP_ALLOW_STEP_SKIP&&(i>tpState.unlocked||(stepGate!==-1&&i>stepGate));
      const done=isStepComplete(s);
      const cls=['tp-step-btn',i===tpState.active?'active':'',done?'done':''].filter(Boolean).join(' ');
      const status=done?ui.done:locked?ui.locked:'';
      return `<button class="${cls}" type="button" data-tp-step="${i}" ${locked?'disabled':''}>
        <span class="tp-step-index">${done?'✓':i+1}</span>
        <span class="tp-step-title">${escapeHtml(s.title)}</span>
        <span class="tp-step-status">${escapeHtml(status)}</span>
      </button>`;
    }).join('');
    list.querySelectorAll('[data-tp-step]').forEach(btn=>{
      btn.addEventListener('click',()=>{tpState.active=parseInt(btn.dataset.tpStep,10);saveTpState();renderTpAtTop();});
    });
  }

  function renderTpQuestions(step){
    const ui=text().ui;
    const target=document.getElementById('tpQuestions');
    if(!step.questions||!step.questions.length){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    target.innerHTML=`<h3>${escapeHtml(ui.questions)}</h3>${step.questions.map(q=>{
      if(q.type==='qcm'){
        return `<div class="tp-field" data-question="${escapeHtml(q.id)}">
          <label>${escapeHtml(q.label)}</label>
          <div class="tp-qcm">${q.options.map(([value,label])=>`
            <label class="tp-option"><input type="radio" name="tp_${escapeHtml(q.id)}" value="${escapeHtml(value)}" ${answerValue(q.id)===value?'checked':''}><span>${escapeHtml(label)}</span></label>
          `).join('')}</div>
        </div>`;
      }
      if(q.type==='number'){
        return `<div class="tp-field">
          <label for="tp_${escapeHtml(q.id)}">${highlightTpTerms(q.label)}</label>
          <input class="tp-input" id="tp_${escapeHtml(q.id)}" type="number" step="any" value="${escapeHtml(answerValue(q.id))}">
        </div>`;
      }
      return `<div class="tp-field">
        <label for="tp_${escapeHtml(q.id)}">${highlightTpTerms(q.label)}</label>
        <textarea class="tp-textarea" id="tp_${escapeHtml(q.id)}">${escapeHtml(answerValue(q.id))}</textarea>
        ${q.help?`<div class="tp-help">${highlightTpTerms(q.help)}</div>`:''}
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
    const ui=text().ui;
    const target=document.getElementById('tpResources');
    const hasCode=!!step.code;
    const hasResources=step.resources&&step.resources.length;
    if(!hasCode&&!hasResources){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    const code=hasCode?`<div class="tp-code ${step.codeLarge?'tp-code-large':''}"><button class="btn btn-sm" type="button" id="tpCopyCodeBtn">${escapeHtml(ui.copy)}</button><pre><code>${escapeHtml(step.code)}</code></pre></div>`:'';
    const links=hasResources?`<div class="tp-tools">${step.resources.map(r=>{
      if(r.tab)return `<button class="tp-link" type="button" data-resource-tab="${escapeHtml(r.tab)}" ${r.panel?`data-resource-panel="${escapeHtml(r.panel)}"`:''}>${highlightTpTerms(r.label)}</button>`;
      return `<a class="tp-link" href="${escapeHtml(r.href)}" target="_blank" rel="noopener">${highlightTpTerms(r.label)}</a>`;
    }).join('')}</div>`:'';
    target.innerHTML=`<h3>${escapeHtml(ui.tools)}</h3>${code}${links}`;
    const copy=document.getElementById('tpCopyCodeBtn');
    if(copy)copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(step.code);showTpFeedback(ui.copied,'ok');}
      catch(_){showTpFeedback(ui.copyFailed,'warn');}
    });
    target.querySelectorAll('[data-resource-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      switchTab(btn.dataset.resourceTab);
      if(btn.dataset.resourcePanel&&window.setPostPanel){
        setTimeout(()=>window.setPostPanel(btn.dataset.resourcePanel),0);
      }
    }));
  }

  function renderTpChecklist(step){
    const ui=text().ui;
    const target=document.getElementById('tpChecklist');
    if(!target)return;
    if(!hasChecklist(step)){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    target.innerHTML=`<h3>${escapeHtml(ui.checklist)}</h3><div class="tp-checklist">${step.checklist.map(item=>`
      <label class="tp-check-item">
        <input type="checkbox" id="tp_${escapeHtml(item.id)}" ${answerValue(item.id)===true?'checked':''}>
        <span>${escapeHtml(item.label)}</span>
      </label>
    `).join('')}</div>`;
    step.checklist.forEach(item=>{
      const el=document.getElementById(`tp_${item.id}`);
      if(el)el.addEventListener('change',e=>setAnswer(item.id,e.target.checked));
    });
  }

  function renderTpInstructions(step,ui){
    const target=document.getElementById('tpInstructions');
    target.innerHTML=`<h3>${escapeHtml(ui.mission)}</h3><ul>${step.instructions.map(x=>`<li>${instructionHtml(x)}</li>`).join('')}</ul>`;
    target.querySelectorAll('[data-tp-modal]').forEach(btn=>{
      btn.addEventListener('click',()=>openTpModal(btn.dataset.tpModal));
    });
  }

  function renderTpIntro(step,ui){
    const target=document.getElementById('tpIntro');
    if(!target)return;
    if(!step.intro||!step.intro.length){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    target.innerHTML=`<h3>${escapeHtml(ui.intro)}</h3><div class="tp-intro-body">${step.intro.map(proseHtml).join('')}</div>`;
    target.querySelectorAll('[data-tp-modal]').forEach(btn=>{
      btn.addEventListener('click',()=>openTpModal(btn.dataset.tpModal));
    });
  }

  function ensureTpModal(){
    let modal=document.getElementById('tpModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='tpModal';
    modal.className='tp-modal';
    modal.innerHTML=`<div class="tp-modal-box">
      <button class="tp-modal-close" type="button" aria-label="Close">✕</button>
      <div id="tpModalBody"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeTpModal();});
    modal.querySelector('.tp-modal-close').addEventListener('click',closeTpModal);
    return modal;
  }

  function closeTpModal(){
    const modal=document.getElementById('tpModal');
    if(modal)modal.style.display='none';
  }

  function openTpModal(kind){
    if(kind!=='omegaAdvanced')return;
    const modal=ensureTpModal();
    const body=document.getElementById('tpModalBody');
    const content=TP_OMEGA_MODAL[langCode()]||TP_OMEGA_MODAL.EN;
    const paragraphs=(content.body||[]).map(p=>`<p>${escapeHtml(p)}</p>`);
    const formulas=(content.formulas||[]).map(mathBlock);
    body.innerHTML=`<h3>${escapeHtml(content.title)}</h3>
      <div class="tp-modal-content">
        ${[paragraphs[0],...formulas,...paragraphs.slice(1)].filter(Boolean).join('')}
      </div>`;
    modal.style.display='flex';
  }

  function renderTp(){
    const ui=text().ui;
    const stepList=steps();
    const max=stepList.length-1;
    tpState.active=Math.min(tpState.active||0,max);
    tpState.unlocked=Math.min(tpState.unlocked||0,max);
    const stepGate=firstIncompleteGateIndex(stepList);
    if(stepGate!==-1&&tpState.active>stepGate){
      tpState.active=stepGate;
      saveTpState();
    }
    const step=stepList[tpState.active];
    renderTpStaticUi();
    document.getElementById('tpKicker').textContent=step.kicker||ui.fallbackKicker;
    document.getElementById('tpTitle').textContent=step.title||ui.fallbackTitle;
    document.getElementById('tpSubtitle').innerHTML=highlightTpTerms(step.subtitle||ui.fallbackSubtitle);
    renderTpIntro(step,ui);
    renderTpInstructions(step,ui);
    renderTpQuestions(step);
    renderTpResources(step);
    renderTpChecklist(step);
    document.getElementById('tpPrevBtn').disabled=tpState.active===0;
    document.getElementById('tpNextBtn').disabled=(!TP_ALLOW_STEP_SKIP&&(tpState.active>=tpState.unlocked||(stepGate!==-1&&tpState.active>=stepGate)))||tpState.active===max;
    document.getElementById('tpExportBtn').style.display=hasQcm(step)?'':'none';
    document.getElementById('tpFeedback').className='tp-feedback';
    document.getElementById('tpFeedback').textContent='';
    renderTpSidebar();
  }

  function scrollTpMainToTop(){
    const main=document.querySelector('.tp-main');
    if(main)main.scrollTo({top:0,behavior:'auto'});
  }

  function renderTpAtTop(){
    renderTp();
    requestAnimationFrame(scrollTpMainToTop);
  }

  function validateTpStep(){
    const ui=text().ui;
    const step=steps()[tpState.active];
    for(const q of step.questions||[]){
      const val=answerValue(q.id);
      if(q.type==='qcm'&&val!==q.answer)return showTpFeedback(ui.qcmWarn,'warn');
      if(q.type==='text'&&String(val).trim().length<(q.min||1))return showTpFeedback(ui.textWarn,'warn');
      if(q.type==='number'){
        const n=parseFloat(val);
        if(!Number.isFinite(n))return showTpFeedback(ui.numberWarn,'warn');
        if(q.minValue!==undefined&&n<q.minValue)return showTpFeedback(ui.minWarn,'warn');
        if(q.maxValue!==undefined&&n>q.maxValue)return showTpFeedback(ui.maxWarn,'warn');
      }
    }
    for(const item of step.checklist||[]){
      if(answerValue(item.id)!==true)return showTpFeedback(ui.checklistWarn,'warn');
    }
    tpState.completed[step.id]=true;
    tpState.unlocked=Math.max(tpState.unlocked,Math.min(tpState.active+1,steps().length-1));
    saveTpState();
    renderTp();
    showTpFeedback(step.success||ui.valid,'ok');
  }

  function showTpFeedback(msg,kind){
    const el=document.getElementById('tpFeedback');
    if(msg&&typeof msg==='object'&&msg.html)el.innerHTML=msg.html;
    else el.innerHTML=highlightTpTerms(msg);
    el.className=`tp-feedback show ${kind}`;
    requestAnimationFrame(()=>scrollTpFeedbackIntoView(el));
  }

  function scrollTpFeedbackIntoView(el){
    const main=el&&el.closest('.tp-main');
    if(main){
      main.scrollTo({top:main.scrollHeight,behavior:'smooth'});
      return;
    }
    if(el)el.scrollIntoView({behavior:'smooth',block:'end'});
  }

  function qcmAnswerLabel(q,value){
    const option=(q.options||[]).find(([optionValue])=>optionValue===value);
    return option?option[1]:'';
  }

  function localDateTimeForText(date){
    const pad=n=>String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}h${pad(date.getMinutes())}`;
  }

  function localTimestampForFile(date){
    const pad=n=>String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}h${pad(date.getMinutes())}`;
  }

  function exportTpAnswers(){
    const ui=text().ui;
    const step=steps()[tpState.active];
    if(!hasQcm(step))return;
    const now=new Date();
    const qcms=(step.questions||[]).filter(q=>q.type==='qcm');
    const lines=[
      ui.exportTitle,
      '',
      `${ui.exportDate}: ${localDateTimeForText(now)}`,
      `${ui.exportStep}: ${step.kicker||''} - ${step.title||''}`.trim(),
      `${ui.exportStatus}: ${isStepComplete(step)?ui.exportValidated:ui.exportNotValidated}`,
      '',
      `${ui.exportQuestions}:`
    ];
    qcms.forEach((q,index)=>{
      const value=answerValue(q.id);
      const label=qcmAnswerLabel(q,value);
      lines.push('');
      lines.push(`${index+1}. ${q.label}`);
      lines.push(`${ui.exportChosen}: ${label||ui.exportNoAnswer}`);
    });
    const blob=new Blob([lines.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`etape${tpState.active+1}_${localTimestampForFile(now)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function ensureTpResetDialog(){
    let modal=document.getElementById('tpResetDialog');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='tpResetDialog';
    modal.className='tp-reset-modal';
    modal.innerHTML=`<div class="tp-reset-box" role="dialog" aria-modal="true" aria-labelledby="tpResetTitle">
      <div class="tp-reset-icon">!</div>
      <h3 id="tpResetTitle"></h3>
      <p id="tpResetBody"></p>
      <div class="tp-reset-actions">
        <button class="btn btn-sm" type="button" id="tpResetCancel"></button>
        <button class="btn btn-sm btn-danger" type="button" id="tpResetConfirm"></button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function showTpResetDialog(onConfirm){
    const ui=text().ui;
    const modal=ensureTpResetDialog();
    document.getElementById('tpResetTitle').textContent=ui.resetTitle;
    document.getElementById('tpResetBody').textContent=ui.resetBody;
    document.getElementById('tpResetCancel').textContent=ui.resetCancel;
    document.getElementById('tpResetConfirm').textContent=ui.resetOk;
    const close=()=>{modal.classList.remove('show');};
    modal.onclick=e=>{if(e.target===modal)close();};
    document.getElementById('tpResetCancel').onclick=close;
    document.getElementById('tpResetConfirm').onclick=()=>{
      close();
      onConfirm();
    };
    modal.classList.add('show');
  }

  window.setTpGuideLanguage=function setTpGuideLanguage(lang){
    forcedLang=normalizeLang(lang);
    if(initialized)renderTp();
  };

  window.initTpGuide=function initTpGuide(options){
    switchTab=(options&&options.switchTab)||function(){};
    getLang=(options&&options.getLang)||getLang;
    forcedLang=normalizeLang(getLang());
    loadTpState();
    initialized=true;
    renderTp();
    document.getElementById('tpValidateBtn').addEventListener('click',validateTpStep);
    document.getElementById('tpPrevBtn').addEventListener('click',()=>{tpState.active=Math.max(0,tpState.active-1);saveTpState();renderTpAtTop();});
    document.getElementById('tpNextBtn').addEventListener('click',()=>{
      const stepList=steps();
      const gate=firstIncompleteGateIndex(stepList);
      const next=TP_ALLOW_STEP_SKIP?Math.min(stepList.length-1,tpState.active+1):Math.min(tpState.unlocked,tpState.active+1);
      tpState.active=gate!==-1&&next>gate?gate:next;
      saveTpState();
      renderTpAtTop();
    });
    document.getElementById('tpResetBtn').addEventListener('click',()=>{
      showTpResetDialog(()=>{
        localStorage.removeItem(TP_STORAGE_KEY);
        tpState={active:0,unlocked:0,completed:{},answers:{}};
        renderTp();
      });
    });
    document.getElementById('tpExportBtn').addEventListener('click',exportTpAnswers);
  };
})();
