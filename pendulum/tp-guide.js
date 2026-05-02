(function(){
  const TP_STORAGE_KEY='pendulum_tp_progress_v1';
  const TP_DEFAULT_GUIDE='part1';
  const TP_GUIDE_IDS=['part1','part2'];
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
            {math:String.raw`\sum \Gamma = J\alpha = J\dot{\omega}`},
            'A torque, also called a moment, is the rotational effect of a force with respect to a chosen point or axis. Given a point and a force, there are two equivalent ways to compute it.',
            'First option: draw the line along which the force acts, measure the shortest distance from the chosen point to that line, and multiply distance by force.',
            {math:String.raw`\Gamma = d_{\perp}F`},
            'Second option: decompose the force into a collinear component and a tangential component. Only the tangential component produces rotation.',
            {math:String.raw`\Gamma = L F_{\mathrm{tan}}`},
            'In both methods, geometry enters the problem. For the pendulum, that means we cannot avoid trigonometric functions.',
            'We also need a viscous force, which opposes motion. In translation we often write:',
            {math:String.raw`F_b=-b\,v`},
            'Here we use the rotational version, with b in N·m·s/rad:',
            {math:String.raw`\Gamma_b=-b\,\omega`},
            'For this pendulum, the mechanical actions to consider are gravity and viscous damping.',
            'Now, with all these ingredients, you can calculate the equations of motion of the pendulum. Go for it!'
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
      ],
      part2Steps:[
        {
          id:'p2-block-diagram',
          requiresValidation:true,
          title:'Pendulum model as a block diagram',
          kicker:'Part 2 - Step 1',
          subtitle:'Build the block diagram with a clear notation for nonlinear blocks.',
          intro:[
            {html:'Draw the block diagram of the pendulum model from the equations obtained in Part 1.'},
            {html:'If a block is nonlinear, use the <strong>double-frame block notation</strong> so that nonlinear parts are immediately visible.'}
          ],
          instructions:[
            {html:'Include the torque sum, the inertia term, the two integrators, and the feedback paths using <strong>θ</strong> and <strong>ω</strong>.'},
            {html:'Mark the <strong>sin(θ)</strong> block as nonlinear with a double frame.'}
          ],
          questions:[
            {type:'qcm',id:'p2_db_integrators',label:'In the block diagram, what is the role of the two integrators?',options:[
              ['chain','They transform angular acceleration into angular velocity, then angular velocity into angle.'],
              ['filter','They only remove sensor noise from the measured signal.'],
              ['gain','They multiply the angle by g/L.'],
              ['trigger','They detect zero crossings to measure the period.']
            ],answer:'chain'},
            {type:'qcm',id:'p2_db_nonlinear',label:'Which block makes the complete pendulum model nonlinear?',options:[
              ['sin','The sin(θ) block in the gravity feedback path.'],
              ['integrator','The integrators, because integration is always nonlinear.'],
              ['sum','The summing junction, because it has several inputs.'],
              ['scope','The plotting or visualization block.']
            ],answer:'sin'}
          ],
          success:'Correct. The diagram and the equations tell the same story: torques create angular acceleration, integration creates motion, and feedback closes the loop.',
          resources:[]
        },
        {
          id:'p2-energy',
          requiresValidation:true,
          missionProse:true,
          missionFirst:true,
          title:'Energy in the pendulum model',
          kicker:'Part 2 - Step 2',
          subtitle:'Build the kinetic, potential, and total mechanical energy step by step.',
          introTitle:'Deriving the energy formulas',
          intro:[
            {html:'Before extending the diagram, let us reconstruct the energy expressions step by step. For a point mass:'},
            {math:String.raw`E_c=\tfrac{1}{2}m\,v^2\qquad E_p=m\,g\,h`},
            {html:'In a pendulum the mass does not move along a straight line; it moves on an arc. To use these formulas you first need to identify <strong>(1)</strong> the tangential velocity <em>v</em> when the angle changes with angular velocity <em>ω</em>, and <strong>(2)</strong> how high the mass rises when the rod makes an angle <em>θ</em>, taking the lowest position as the reference (h = 0).'},
            {html:'Hint — for a point on a rigid arm of length <em>r</em> rotating around a pivot, the arc length travelled is:'},
            {math:String.raw`s=r\cdot\theta`},
            {html:'The tangential velocity is the time derivative of that arc length, <em>v</em><sub>t</sub> = d<em>s</em>/d<em>t</em>. For the height <em>h</em>, look at the pendulum geometry and apply basic trigonometry.'},
            {html:'Once you have <em>v</em> and <em>h</em>, the total mechanical energy is simply the sum:'},
            {math:String.raw`E_m=E_c+E_p`}
          ],
          instructions:[
            {html:'Goal: starting from the OpenModelica block diagram you already built (with <em>θ</em> and <em>ω</em>), <strong>extend it by adding the blocks needed</strong> to compute the kinetic energy <em>E<sub>c</sub></em>, the potential energy <em>E<sub>p</sub></em> and the total mechanical energy <em>E<sub>m</sub></em>. Then <strong>simulate the system and analyse how <em>E<sub>c</sub></em>, <em>E<sub>p</sub></em> and <em>E<sub>m</sub></em> evolve over time</strong> for <em>b</em> = 0, a small <em>b</em>, and a large <em>b</em>.'}
          ],
          questions:[
            {type:'qcm',id:'p2_energy_extrema',label:'During the oscillation, what happens with the maxima and minima of Ec and Ep?',options:[
              ['together','Ec and Ep reach their maxima at the same instant.'],
              ['ec_bigger','Ec is always larger than Ep throughout the motion.'],
              ['exchange','When Ec reaches a maximum, Ep reaches a minimum (and vice versa): the energy is exchanged between the two.'],
              ['constant','Ec and Ep are always constant: they have no maxima or minima.']
            ],answer:'exchange'},
            {type:'qcm',id:'p2_energy_b_zero',label:'What happens to the total mechanical energy Em if b = 0?',options:[
              ['grows','It grows over time.'],
              ['conserved','It is conserved (constant in time), exchanging back and forth between kinetic and potential.'],
              ['decays','It decays exponentially.'],
              ['zero','It is always zero.']
            ],answer:'conserved'},
            {type:'qcm',id:'p2_energy_b_positive',label:'What happens to the total mechanical energy Em if b > 0?',options:[
              ['constant','It stays constant, just like with b = 0.'],
              ['grows','It grows because b injects energy.'],
              ['random','It becomes random.'],
              ['decreases','It decreases over time because damping dissipates energy.']
            ],answer:'decreases'}
          ],
          success:{html:'Correct. Kinetic and potential energy alternate (one is at a maximum when the other is at a minimum) for any value of <em>b</em>. With <em>b</em> = 0 the total <em>E<sub>m</sub></em> = <em>E<sub>c</sub></em> + <em>E<sub>p</sub></em> stays constant; with <em>b</em> &gt; 0, damping dissipates energy and <em>E<sub>m</sub></em> decreases over time.'},
          resources:[]
        },
        {
          id:'p2-paper-damper',
          requiresValidation:true,
          title:'Paper brake accessory',
          kicker:'Part 2 - Step 3',
          subtitle:'Compare a small and a large paper surface.',
          instructions:[
            'Use the pendulum accessory that holds a paper sheet, if it is available.',
            'Test two cases: a small sheet area and a large sheet area.',
            'Record or observe how quickly the oscillation amplitude decays in both cases.'
          ],
          questions:[
            {type:'qcm',id:'p2_paper_decay',label:'What should happen with a larger paper sheet?',options:[
              ['slower','The amplitude should decay more slowly because the sheet stores energy.'],
              ['same','The decay should be exactly the same as with a small sheet.'],
              ['faster','The amplitude should decay faster because air drag is larger.'],
              ['period_zero','The period becomes zero.']
            ],answer:'faster'},
            {type:'qcm',id:'p2_paper_model',label:'In the simplified viscous model, which parameter mostly represents this effect?',options:[
              ['g','The gravitational acceleration g.'],
              ['theta0','Only the initial angle θ(0).'],
              ['time','The simulation final time.'],
              ['b','The damping coefficient b.']
            ],answer:'b'}
          ],
          success:'Correct. A larger sheet increases the aerodynamic braking effect, so the oscillation loses energy faster.',
          resources:[{label:'Open Acquisition',tab:'acq'}]
        },
        {
          id:'p2-sinusoidal-fit',
          requiresValidation:true,
          title:'Sinusoidal fit',
          kicker:'Part 2 - Step 4',
          subtitle:'Fit the recorded motion with a damped sinusoid.',
          intro:[
            {html:'In this step, we will fit experimental data to a mathematical model. "Fitting" means finding the constant values (parameters) of an equation so that the resulting curve matches your real-world measurements as closely as possible.'},
            {html:'The model we use is an <strong>exponentially decaying sinusoid</strong>:'},
            {math:String.raw`\theta(t) = A \cdot e^{-\delta t} \cdot \sin(\omega t - \phi) + B`},
            {html:'This choice is not accidental and has a physical reason that the teacher will explain during the lab session (ask them!). Specifically, the parameters of this function are related to the physical parameters of the pendulum (mass, friction coefficient, L, gravity).'},
            {html:'However, this formula is an approximation and might not adapt perfectly to the entire range of oscillation.'},
            {html:'<strong>Objective:</strong> Determine in which region (large angles or small angles) the mathematical model describes reality more accurately.'},
            {html:'To measure the "fidelity" of the model, we use the <strong>R² (R-squared)</strong> coefficient. A detailed explanation is available by clicking the [?] button next to the R² value in the analysis tool.'}
          ],
          instructions:[
            'Load your experimental CSV or use current acquisition data.',
            'Open the "Sinusoidal fit" analysis tool.',
            'Try fitting the curve in different zones: first at the beginning (large angles) and then later (small angles).',
            'Compare the R² values and pay attention to how well the envelope follows the peaks in both cases.',
            'Open the R² help modal if needed before answering.'
          ],
          questions:[
            {type:'qcm',id:'p2_fit_small_angle',label:'In which range of angles did you obtain a better fit (higher R²)?',options:[
              ['large','Large angles (at the start of the recording).'],
              ['inter','Only intermediate angles (between 60° and 45°).'],
              ['small','Small angles (towards the end of the recording).'],
              ['mixed','Large oscillations and small ones (under 10°), but it fails in the intermediate range.']
            ],answer:'small'},
            {type:'qcm',id:'p2_fit_r2',label:'If the fit has a high R² and the residuals stay small over the selected window, what can we conclude?',options:[
              ['exact_global','The same fit is guaranteed to describe all amplitudes and all future data exactly.'],
              ['good_window','The chosen damped sinusoid describes that window of data well.'],
              ['no_damping','The pendulum has no damping.']
            ],answer:'good_window'},
            {type:'qcm',id:'p2_fit_residuals',label:'In the R² calculation, what is a residual?',options:[
              ['mean','The mean value of θ over the whole experiment.'],
              ['period','The time between two zero crossings.'],
              ['difference','The point-by-point difference θ_data(t_k) - θ_fit(t_k).']
            ],answer:'difference'},
            {type:'qcm',id:'p2_fit_square',label:'Why do we square residuals before summing them?',options:[
              ['units','So the result has units of seconds.'],
              ['linearize','To linearize sin(θ).'],
              ['cancel','So positive and negative errors do not cancel each other.']
            ],answer:'cancel'},
            {type:'qcm',id:'p2_fit_negative_r2',label:'What does a negative R² mean?',options:[
              ['perfect','The fit is perfect but the phase is negative.'],
              ['worse_lazy','The fitted model is worse than the lazy model that always predicts the mean angle.'],
              ['no_units','R² has no units, so negative values have no meaning.']
            ],answer:'worse_lazy'}
          ],
          success:'Correct. The sinusoidal fit is a compact experimental description of the small-angle motion: period, frequency, damping, phase, and offset in one curve.',
          resources:[{label:'Open Sinusoidal fit',tab:'post',panel:'fit'}]
        },
        {
          id:'p2-system-identification',
          requiresValidation:true,
          title:'System identification',
          kicker:'Part 2 - Step 5',
          subtitle:'Adjust physical parameters by comparing an ODE model with the measurement.',
          intro:[
            {html:'In the previous step we adjusted a damped sinusoid — a mathematical curve chosen because it looks like the motion. Here we take a different step: instead of fitting a curve, we fit the <strong>physical constants of the pendulum</strong> (length and damping) inside its differential equation.'},
            {html:'The model is the pendulum ODE with linear viscous friction:'},
            {math:String.raw`\ddot{\theta} + \frac{b}{mL^2}\,\dot{\theta} + \frac{g}{L}\sin\theta = 0`},
            {html:'<strong>Identifying</strong> the system means asking the data: <em>which values of L and damping make this equation, simulated in time, reproduce the measured θ(t) as closely as possible?</em>'},
            {html:'This is a case of <strong>grey-box identification</strong>: the shape of the equation comes from physics, but we are also assuming simplifications (linear viscous damping, point mass, massless rigid rod) that may not be exact. So when reading the result, a good fit means the simplified structure is reasonable in that range; a poor fit usually means the model is missing physics (Coulomb friction, aerodynamic drag, rod inertia), not just bad numbers.'},
            {html:'A subtle but important point: from θ(t) alone, the data <strong>cannot separate</strong> b and m — only the ratio b/(mL²) is identifiable. To convert that ratio into an absolute b, you have to <strong>measure or assume</strong> a mass.'},
            {html:'Result: instead of A, ω, δ, φ (parameters of a curve), we obtain <strong>L</strong> and <strong>b/(mL²)</strong> — numbers with direct mechanical meaning. For a wider discussion (black/white/grey box, how the algorithm works), open the <strong>💡 What are we identifying?</strong> button inside the analysis tool.'}
          ],
          instructions:[
            'Open the System identification analysis on the same data.',
            'Choose a start time and a duration where the measured signal is clean and representative.',
            'Launch the identification and compare θ_data(t) with θ_model(t). Then read the identified L and equivalent damping parameters.'
          ],
          questions:[
            {type:'qcm',id:'p2_sysid_vs_fit',label:'What is the main difference between sinusoidal fit and system identification here?',options:[
              ['same','They are exactly the same calculation with different names.'],
              ['visual','System identification only changes the color of the measured curve.'],
              ['ode','System identification simulates the pendulum ODE and adjusts physical parameters so the model follows the data.'],
              ['manual','System identification does not use measured data.']
            ],answer:'ode'},
            {type:'qcm',id:'p2_sysid_nonseparable',label:'With θ(t) alone, why must we be careful when interpreting b and m separately?',options:[
              ['no_mass','Because mass never has any influence on any pendulum model.'],
              ['ratio','Because the motion sees the ratio b/(mL²), so different b and m values can produce the same dynamics if that ratio is unchanged.'],
              ['only_b','Because the data identify b exactly but never L.'],
              ['only_m','Because the data identify m exactly but never b.']
            ],answer:'ratio'}
          ],
          success:'Correct. System identification connects the measured curve back to the physical ODE. It is more demanding than a visual fit, but it gives parameters with mechanical meaning.',
          resources:[{label:'Open System identification',tab:'post',panel:'sysid'}]
        },
        {
          id:'p2-torsion-spring',
          requiresValidation:true,
          hidden:true,
          title:'Add a torsion spring',
          kicker:'Part 2 - Step 6',
          subtitle:'Modify the diagram with a torque proportional to angle.',
          instructions:[
            {html:'Now imagine a torsion spring connected to the shaft. It creates a restoring torque proportional to the angle:'},
            {math:String.raw`\Gamma_k=-k\theta`},
            {html:'Modify the block diagram by adding this torque to the torque sum. Then simulate with different initial positions <strong>θ(0)</strong> and compare the motion.'}
          ],
          questions:[
            {type:'qcm',id:'p2_spring_torque',label:'Which torque should be added for a torsion spring?',options:[
              ['spring','Γ_k = -kθ.'],
              ['viscous','Γ_k = -bω.'],
              ['gravity','Γ_k = -mgL sin(θ).'],
              ['constant','Γ_k = k, independent of angle.']
            ],answer:'spring'},
            {type:'qcm',id:'p2_spring_effect',label:'What is the qualitative effect of adding a restoring torsion spring?',options:[
              ['stiffer','The system becomes effectively stiffer, so the oscillation frequency generally increases.'],
              ['damping','It only adds damping and cannot change the frequency.'],
              ['noise','It only adds measurement noise.'],
              ['remove_gravity','It cancels gravity for every angle.']
            ],answer:'stiffer'}
          ],
          success:'Correct. The torsion spring adds another restoring torque in the block diagram, so the dynamics change even with the same initial condition.',
          resources:[{label:'Open Acquisition & Simulation',tab:'acq'}]
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
            {math:String.raw`\sum \Gamma = J\alpha = J\dot{\omega}`},
            'Un couple, ou moment, est l’effet rotationnel d’une force par rapport à un point ou à un axe choisi. Étant donnés un point et une force, il y a deux façons équivalentes de le calculer.',
            'Première option : tracer la droite sur laquelle agit la force, mesurer la distance minimale entre le point choisi et cette droite, puis multiplier distance par force.',
            {math:String.raw`\Gamma = d_{\perp}F`},
            'Deuxième option : décomposer la force en une composante colinéaire et une composante tangentielle. Seule la composante tangentielle produit une rotation.',
            {math:String.raw`\Gamma = L F_{\mathrm{tan}}`},
            'Dans les deux méthodes, la géométrie entre dans le problème. Pour le pendule, cela veut dire qu’on ne peut pas éviter les fonctions trigonométriques.',
            'La force de gravité exercée sur la masse s’appelle le poids :',
            {math:String.raw`F_g = m g`},
            'Comme cette force agit à une certaine distance de l’axe de rotation, elle produit un moment par rapport au pivot. À vous de le déduire.',
            'Il faut aussi introduire une force visqueuse, qui s’oppose au mouvement. En translation, on écrit souvent :',
            {math:String.raw`F_b=-b\,v`},
            'Ici, on utilise la version rotationnelle, avec b en N·m·s/rad :',
            {math:String.raw`\Gamma_b=-b\,\omega`},
            'Pour ce pendule, les actions mécaniques à prendre en compte sont la gravité et l’amortissement visqueux.',
            'Maintenant, avec tous ces éléments, vous pouvez calculer les équations du mouvement du pendule. Allez-y !'
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
      ],
      part2Steps:[
        {
          id:'p2-block-diagram',
          requiresValidation:true,
          title:'Modèle du pendule en diagramme de blocs',
          kicker:'Partie 2 - Étape 1',
          subtitle:'Construisez le diagramme avec une notation claire pour les blocs non linéaires.',
          intro:[
            {html:'Dessinez le diagramme de blocs du modèle du pendule à partir des équations obtenues en Partie 1.'},
            {html:'Si un bloc est non linéaire, utilisez la <strong>notation en double cadre</strong> pour l’identifier immédiatement.'}
          ],
          instructions:[
            {html:'Incluez la somme des moments, le terme d’inertie, les deux intégrateurs, et les retours utilisant <strong>θ</strong> et <strong>ω</strong>.'},
            {html:'Marquez le bloc <strong>sin(θ)</strong> comme non linéaire avec un double cadre.'}
          ],
          questions:[
            {type:'qcm',id:'p2_db_integrators',label:'Dans le diagramme de blocs, quel est le rôle des deux intégrateurs ?',options:[
              ['chain','Ils transforment l’accélération angulaire en vitesse angulaire, puis la vitesse angulaire en angle.'],
              ['filter','Ils servent seulement à enlever le bruit du signal mesuré.'],
              ['gain','Ils multiplient l’angle par g/L.'],
              ['trigger','Ils détectent les passages par zéro pour mesurer la période.']
            ],answer:'chain'},
            {type:'qcm',id:'p2_db_nonlinear',label:'Quel bloc rend le modèle complet du pendule non linéaire ?',options:[
              ['sin','Le bloc sin(θ) dans le retour de gravité.'],
              ['integrator','Les intégrateurs, car toute intégration est non linéaire.'],
              ['sum','Le sommateur, car il a plusieurs entrées.'],
              ['scope','Le bloc de tracé ou de visualisation.']
            ],answer:'sin'}
          ],
          success:'Correct. Le diagramme et les équations racontent la même histoire : les moments créent l’accélération angulaire, l’intégration crée le mouvement, et le retour ferme la boucle.',
          resources:[]
        },
        {
          id:'p2-energy',
          requiresValidation:true,
          missionProse:true,
          missionFirst:true,
          title:'Énergie dans le modèle du pendule',
          kicker:'Partie 2 - Étape 2',
          subtitle:'Construisez pas à pas l’énergie cinétique, potentielle et mécanique totale.',
          introTitle:'Dérivation des formules d’énergie',
          intro:[
            {html:'Avant d’étendre le diagramme, reconstruisons pas à pas les expressions des énergies. Pour une masse ponctuelle :'},
            {math:String.raw`E_c=\tfrac{1}{2}m\,v^2\qquad E_p=m\,g\,h`},
            {html:'Dans un pendule, la masse ne se déplace pas en ligne droite : elle se déplace sur un arc. Pour utiliser ces formules, il faut d’abord identifier <strong>(1)</strong> la vitesse tangentielle <em>v</em> lorsque l’angle varie avec une vitesse angulaire <em>ω</em>, et <strong>(2)</strong> de combien la masse s’élève quand la tige forme un angle <em>θ</em>, en prenant la position basse comme référence (h = 0).'},
            {html:'Indice — pour un point sur un bras rigide de longueur <em>r</em> qui tourne autour d’un pivot, la longueur d’arc parcourue est :'},
            {math:String.raw`s=r\cdot\theta`},
            {html:'La vitesse tangentielle est la dérivée temporelle de cette longueur d’arc, <em>v</em><sub>t</sub> = d<em>s</em>/d<em>t</em>. Pour la hauteur <em>h</em>, observez la géométrie du pendule et appliquez de la trigonométrie de base.'},
            {html:'Une fois <em>v</em> et <em>h</em> obtenus, l’énergie mécanique totale est simplement la somme :'},
            {math:String.raw`E_m=E_c+E_p`}
          ],
          instructions:[
            {html:'Objectif : à partir du diagramme de blocs OpenModelica que vous avez déjà construit (avec <em>θ</em> et <em>ω</em>), <strong>étendez-le en ajoutant les blocs nécessaires</strong> pour calculer l’énergie cinétique <em>E<sub>c</sub></em>, l’énergie potentielle <em>E<sub>p</sub></em> et l’énergie mécanique totale <em>E<sub>m</sub></em>. Ensuite, <strong>simulez le système et analysez l’évolution de <em>E<sub>c</sub></em>, <em>E<sub>p</sub></em> et <em>E<sub>m</sub></em> au cours du temps</strong> pour <em>b</em> = 0, un petit <em>b</em> et un grand <em>b</em>.'}
          ],
          questions:[
            {type:'qcm',id:'p2_energy_extrema',label:'Pendant l’oscillation, que se passe-t-il avec les maxima et minima de Ec et Ep ?',options:[
              ['together','Ec et Ep atteignent leurs maxima au même instant.'],
              ['ec_bigger','Ec est toujours plus grande que Ep tout au long du mouvement.'],
              ['exchange','Quand Ec atteint un maximum, Ep atteint un minimum (et inversement) : l’énergie s’échange entre les deux.'],
              ['constant','Ec et Ep sont toujours constantes : elles n’ont ni maxima ni minima.']
            ],answer:'exchange'},
            {type:'qcm',id:'p2_energy_b_zero',label:'Que devient l’énergie mécanique totale Em si b = 0 ?',options:[
              ['grows','Elle croît avec le temps.'],
              ['conserved','Elle se conserve (constante dans le temps), en s’échangeant entre cinétique et potentielle.'],
              ['decays','Elle décroît exponentiellement.'],
              ['zero','Elle est toujours nulle.']
            ],answer:'conserved'},
            {type:'qcm',id:'p2_energy_b_positive',label:'Que devient l’énergie mécanique totale Em si b > 0 ?',options:[
              ['constant','Elle reste constante, comme pour b = 0.'],
              ['grows','Elle augmente car b injecte de l’énergie.'],
              ['random','Elle devient aléatoire.'],
              ['decreases','Elle diminue avec le temps car l’amortissement dissipe de l’énergie.']
            ],answer:'decreases'}
          ],
          success:{html:'Correct. Énergies cinétique et potentielle alternent (l’une est maximale quand l’autre est minimale) pour toute valeur de <em>b</em>. Avec <em>b</em> = 0, le total <em>E<sub>m</sub></em> = <em>E<sub>c</sub></em> + <em>E<sub>p</sub></em> reste constant ; avec <em>b</em> &gt; 0, l’amortissement dissipe de l’énergie et <em>E<sub>m</sub></em> diminue au cours du temps.'},
          resources:[]
        },
        {
          id:'p2-paper-damper',
          requiresValidation:true,
          title:'Accessoire frein en papier',
          kicker:'Partie 2 - Étape 3',
          subtitle:'Comparez une petite et une grande surface de papier.',
          instructions:[
            'Utilisez l’accessoire qui maintient une feuille de papier sur le pendule, s’il est disponible.',
            'Testez deux cas : une petite surface de papier et une grande surface de papier.',
            'Enregistrez ou observez la vitesse de décroissance de l’amplitude dans les deux cas.'
          ],
          questions:[
            {type:'qcm',id:'p2_paper_decay',label:'Que devrait-on observer avec une feuille plus grande ?',options:[
              ['slower','L’amplitude devrait décroître plus lentement car la feuille stocke de l’énergie.'],
              ['same','La décroissance devrait être exactement la même qu’avec une petite feuille.'],
              ['faster','L’amplitude devrait décroître plus vite car la traînée de l’air est plus grande.'],
              ['period_zero','La période devient nulle.']
            ],answer:'faster'},
            {type:'qcm',id:'p2_paper_model',label:'Dans le modèle visqueux simplifié, quel paramètre représente principalement cet effet ?',options:[
              ['g','L’accélération de la gravité g.'],
              ['theta0','Seulement l’angle initial θ(0).'],
              ['time','Le temps final de simulation.'],
              ['b','Le coefficient d’amortissement b.']
            ],answer:'b'}
          ],
          success:'Correct. Une plus grande feuille augmente le freinage aérodynamique : l’oscillation perd son énergie plus vite.',
          resources:[{label:'Ouvrir Acquisition',tab:'acq'}]
        },
        {
          id:'p2-sinusoidal-fit',
          requiresValidation:true,
          title:'Ajustement sinusoïdal',
          kicker:'Partie 2 - Étape 4',
          subtitle:'Ajustez le mouvement enregistré avec une sinusoïde amortie.',
          intro:[
            {html:'Dans cette étape, nous allons ajuster les données expérimentales à un modèle mathématique. "Ajuster" (ou "fitter") signifie trouver les valeurs des paramètres constants d\'une équation pour que la courbe résultante corresponde le mieux possible à vos mesures réelles.'},
            {html:'Le modèle utilisé est une <strong>sinusoïde à décroissance exponentielle</strong> :'},
            {math:String.raw`\theta(t) = A \cdot e^{-\delta t} \cdot \sin(\omega t - \phi) + B`},
            {html:'Ce choix n\'est pas dû au hasard et possède une raison physique que l\'enseignant expliquera pendant la séance de TP (demandez-lui !). En particulier, les paramètres de cette fonction sont liés aux paramètres physiques du pendule (masse, coefficient de frottement, L, gravité).'},
            {html:'Cependant, cette formule est une approximation et pourrait ne pas s\'adapter parfaitement à toute la plage d\'oscillation.'},
            {html:'<strong>Objectif :</strong> Déterminer dans quelle zone (grands angles ou petits angles) le modèle mathématique décrit le mieux la réalité.'},
            {html:'Pour mesurer la "fidélité" du modèle, nous utilisons le coefficient <strong>R²</strong>. Une explication détaillée est disponible en cliquant sur le bouton [?] à côté de la valeur de R² dans l\'outil d\'analyse.'}
          ],
          instructions:[
            'Chargez votre CSV expérimental ou utilisez les données d\'acquisition actuelles.',
            'Ouvrez l\'outil d\'analyse "Ajustement sinusoïdal".',
            'Essayez d\'ajuster la courbe dans différentes zones : d\'abord au début (grands angles), puis plus tard (petits angles).',
            'Comparez les valeurs de R² et observez si l\'enveloppe suit bien les pics dans les deux cas.',
            'Ouvrez l\'aide sur le R² si nécessaire avant de répondre.'
          ],
          questions:[
            {type:'qcm',id:'p2_fit_small_angle',label:'Dans quelle plage d\'angles l\'ajustement a-t-il le mieux fonctionné (R² plus élevé) ?',options:[
              ['large','Grands angles (au début de l\'enregistrement).'],
              ['inter','Uniquement les angles intermédiaires (entre 60° et 45°).'],
              ['small','Petits angles (vers la fin de l\'enregistrement).'],
              ['mixed','Grandes oscillations et très petites (moins de 10°), mais ne fonctionne pas entre les deux.']
            ],answer:'small'},
            {type:'qcm',id:'p2_fit_r2',label:'Si l’ajustement a un R² élevé et des résidus faibles sur la fenêtre choisie, que peut-on conclure ?',options:[
              ['exact_global','Le même ajustement décrit forcément toutes les amplitudes et toutes les données futures exactement.'],
              ['good_window','La sinusoïde amortie choisie décrit bien cette fenêtre de données.'],
              ['no_damping','Le pendule n’a pas d’amortissement.']
            ],answer:'good_window'},
            {type:'qcm',id:'p2_fit_residuals',label:'Dans le calcul de R², qu’est-ce qu’un résidu ?',options:[
              ['mean','La valeur moyenne de θ sur toute l’expérience.'],
              ['period','Le temps entre deux passages par zéro.'],
              ['difference','La différence point par point θ_data(t_k) - θ_fit(t_k).']
            ],answer:'difference'},
            {type:'qcm',id:'p2_fit_square',label:'Pourquoi élève-t-on les résidus au carré avant de les sommer ?',options:[
              ['units','Pour obtenir un résultat en secondes.'],
              ['linearize','Pour linéariser sin(θ).'],
              ['cancel','Pour éviter que les erreurs positives et négatives s’annulent.']
            ],answer:'cancel'},
            {type:'qcm',id:'p2_fit_negative_r2',label:'Que signifie un R² négatif ?',options:[
              ['perfect','L’ajustement est parfait mais la phase est négative.'],
              ['worse_lazy','Le modelo ajusté est pire que le modèle paresseux qui prédit toujours l’angle moyen.'],
              ['no_units','R² n’a pas d’unité, donc les valeurs négatives n’ont pas de sens.']
            ],answer:'worse_lazy'}
          ],
          success:'Correct. L’ajustement sinusoïdal donne une description expérimentale compacte du mouvement aux petits angles : période, fréquence, amortissement, phase et offset dans une seule courbe.',
          resources:[{label:'Ouvrir Ajustement sinusoïdal',tab:'post',panel:'fit'}]
        },
        {
          id:'p2-system-identification',
          requiresValidation:true,
          title:'Identification de système',
          kicker:'Partie 2 - Étape 5',
          subtitle:'Ajustez les paramètres physiques en comparant un modèle EDO à la mesure.',
          intro:[
            {html:'À l’étape précédente, on a ajusté une sinusoïde amortie — une courbe mathématique choisie parce qu’elle ressemble au mouvement. Ici, on franchit un pas : au lieu d’ajuster une courbe, on ajuste les <strong>constantes physiques du pendule</strong> (longueur et amortissement) à l’intérieur de son équation différentielle.'},
            {html:'Le modèle est l’EDO du pendule avec frottement visqueux linéaire :'},
            {math:String.raw`\ddot{\theta} + \frac{b}{mL^2}\,\dot{\theta} + \frac{g}{L}\sin\theta = 0`},
            {html:'<strong>Identifier</strong> le système, c’est poser cette question aux données : <em>quelles valeurs de L et d’amortissement font que cette équation, simulée dans le temps, reproduit au mieux la θ(t) mesurée ?</em>'},
            {html:'Il s’agit d’une identification de type <strong>boîte grise</strong> : la forme de l’équation vient de la physique, mais on suppose aussi des simplifications (frottement visqueux linéaire, masse ponctuelle, tige rigide sans masse) qui ne sont pas forcément exactes. À la lecture du résultat : un bon ajustement signifie que la structure simplifiée est raisonnable dans cette plage ; un mauvais ajustement veut souvent dire que le modèle manque de physique (frottement de Coulomb, traînée aérodynamique, inertie de la tige), et pas seulement de meilleurs paramètres.'},
            {html:'Point subtil mais important : à partir de θ(t) seul, les données <strong>ne peuvent pas séparer</strong> b et m — seul le rapport b/(mL²) est identifiable. Pour convertir ce rapport en un b absolu, il faut <strong>mesurer ou supposer</strong> une masse.'},
            {html:'Résultat : au lieu de A, ω, δ, φ (paramètres d’une courbe), on obtient <strong>L</strong> et <strong>b/(mL²)</strong> — des nombres ayant un sens mécanique direct. Pour une discussion plus large (boîte noire/blanche/grise, fonctionnement de l’algorithme), ouvrez le bouton <strong>💡 Qu’identifie-t-on ?</strong> dans l’outil d’analyse.'}
          ],
          instructions:[
            'Ouvrez l’analyse Identification de système sur les mêmes données.',
            'Choisissez un temps de départ et une durée où le signal mesuré est propre et représentatif.',
            'Lancez l’identification et comparez θ_data(t) avec θ_model(t). Lisez ensuite la longueur L identifiée et les paramètres d’amortissement équivalents.'
          ],
          questions:[
            {type:'qcm',id:'p2_sysid_vs_fit',label:'Quelle est la différence principale entre l’ajustement sinusoïdal et l’identification de système ici ?',options:[
              ['same','Ce sont exactement les mêmes calculs avec deux noms différents.'],
              ['visual','L’identification change seulement la couleur de la courbe mesurée.'],
              ['ode','L’identification simule l’EDO du pendule et ajuste des paramètres physiques pour suivre les données.'],
              ['manual','L’identification n’utilise pas les données mesurées.']
            ],answer:'ode'},
            {type:'qcm',id:'p2_sysid_nonseparable',label:'Avec θ(t) seul, pourquoi faut-il être prudent en interprétant b et m séparément ?',options:[
              ['no_mass','Parce que la masse n’a jamais aucune influence dans aucun modèle de pendule.'],
              ['ratio','Parce que le mouvement voit le rapport b/(mL²) : plusieurs valeurs de b et m peuvent donner la même dynamique si ce rapport ne change pas.'],
              ['only_b','Parce que les données identifient b exactement mais jamais L.'],
              ['only_m','Parce que les données identifient m exactement mais jamais b.']
            ],answer:'ratio'}
          ],
          success:'Correct. L’identification de système relie la courbe mesurée à l’EDO physique. C’est plus exigeant qu’un ajustement visuel, mais les paramètres obtenus ont un sens mécanique.',
          resources:[{label:'Ouvrir Identification de système',tab:'post',panel:'sysid'}]
        },
        {
          id:'p2-torsion-spring',
          requiresValidation:true,
          hidden:true,
          title:'Ajouter un ressort de torsion',
          kicker:'Partie 2 - Étape 6',
          subtitle:'Modifiez le diagramme avec un couple proportionnel à l’angle.',
          instructions:[
            {html:'Imaginez maintenant un ressort de torsion connecté à l’axe. Il crée un couple de rappel proportionnel à l’angle :'},
            {math:String.raw`\Gamma_k=-k\theta`},
            {html:'Modifiez le diagramme de blocs en ajoutant ce couple dans la somme des moments. Simulez ensuite avec différentes positions initiales <strong>θ(0)</strong> et comparez le mouvement.'}
          ],
          questions:[
            {type:'qcm',id:'p2_spring_torque',label:'Quel couple faut-il ajouter pour un ressort de torsion ?',options:[
              ['spring','Γ_k = -kθ.'],
              ['viscous','Γ_k = -bω.'],
              ['gravity','Γ_k = -mgL sin(θ).'],
              ['constant','Γ_k = k, indépendant de l’angle.']
            ],answer:'spring'},
            {type:'qcm',id:'p2_spring_effect',label:'Quel est l’effet qualitatif d’un ressort de torsion de rappel ?',options:[
              ['stiffer','Le système devient effectivement plus raide, donc la fréquence d’oscillation augmente généralement.'],
              ['damping','Il ajoute seulement de l’amortissement et ne peut pas changer la fréquence.'],
              ['noise','Il ajoute seulement du bruit de mesure.'],
              ['remove_gravity','Il annule la gravité pour tous les angles.']
            ],answer:'stiffer'}
          ],
          success:'Correct. Le ressort de torsion ajoute un autre couple de rappel dans le diagramme de blocs ; la dynamique change donc même avec la même condition initiale.',
          resources:[{label:'Ouvrir Acquisition et simulation',tab:'acq'}]
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
            {math:String.raw`\sum \Gamma = J\alpha = J\dot{\omega}`},
            'Un torque, o momento, es el efecto rotacional de una fuerza respecto de un punto o eje elegido. Dados un punto y una fuerza, hay dos formas equivalentes de calcularlo.',
            'Primera opción: trazar la recta por la que pasa la fuerza, medir la distancia mínima entre el punto elegido y esa recta, y multiplicar distancia por fuerza.',
            {math:String.raw`\Gamma = d_{\perp}F`},
            'Segunda opción: descomponer la fuerza en una componente colineal y una componente tangencial. Solo la componente tangencial produce rotación.',
            {math:String.raw`\Gamma = L F_{\mathrm{tan}}`},
            'En cualquiera de los dos métodos entra la geometría. Para el péndulo, eso significa que no nos salvamos de usar funciones trigonométricas.',
            'También necesitamos introducir una fuerza viscosa, que se opone al movimiento. En traslación solemos escribir:',
            {math:String.raw`F_b=-b\,v`},
            'Acá usamos la versión rotacional, con b en N·m·s/rad:',
            {math:String.raw`\Gamma_b=-b\,\omega`},
            'Para este péndulo, las acciones mecánicas que hay que considerar son la gravedad y el amortiguamiento viscoso.',
            'Ahora, con todos estos elementos, ya podés calcular las ecuaciones de movimiento del péndulo. ¡Vamos!'
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
      ],
      part2Steps:[
        {
          id:'p2-block-diagram',
          requiresValidation:true,
          title:'Modelo del péndulo en diagrama de bloques',
          kicker:'Parte 2 - Paso 1',
          subtitle:'Construí el diagrama con una notación clara para bloques no lineales.',
          intro:[
            {html:'Dibujá el diagrama de bloques del modelo del péndulo a partir de las ecuaciones obtenidas en la Parte 1.'},
            {html:'Si un bloque es no lineal, usá la <strong>notación de doble recuadro</strong> para identificarlo fácilmente.'}
          ],
          instructions:[
            {html:'Incluí la suma de torques, el término de inercia, los dos integradores, y las realimentaciones que usan <strong>θ</strong> y <strong>ω</strong>.'},
            {html:'Marcá el bloque <strong>sin(θ)</strong> como no lineal con doble recuadro.'}
          ],
          questions:[
            {type:'qcm',id:'p2_db_integrators',label:'En el diagrama de bloques, ¿cuál es el rol de los dos integradores?',options:[
              ['chain','Transforman la aceleración angular en velocidad angular, y luego la velocidad angular en ángulo.'],
              ['filter','Solo eliminan ruido del sensor en la señal medida.'],
              ['gain','Multiplican el ángulo por g/L.'],
              ['trigger','Detectan cruces por cero para medir el período.']
            ],answer:'chain'},
            {type:'qcm',id:'p2_db_nonlinear',label:'¿Qué bloque vuelve no lineal al modelo completo del péndulo?',options:[
              ['sin','El bloque sin(θ) en la realimentación de gravedad.'],
              ['integrator','Los integradores, porque integrar siempre es no lineal.'],
              ['sum','El sumador, porque tiene varias entradas.'],
              ['scope','El bloque de gráfico o visualización.']
            ],answer:'sin'}
          ],
          success:'Correcto. El diagrama y las ecuaciones cuentan la misma historia: los torques crean aceleración angular, la integración crea movimiento y la realimentación cierra el lazo.',
          resources:[]
        },
        {
          id:'p2-energy',
          requiresValidation:true,
          missionProse:true,
          missionFirst:true,
          title:'Energía en el modelo del péndulo',
          kicker:'Parte 2 - Paso 2',
          subtitle:'Construí paso a paso la energía cinética, potencial y mecánica total.',
          introTitle:'Derivación de las fórmulas de energía',
          intro:[
            {html:'Antes de extender el diagrama, vamos a reconstruir paso a paso las expresiones de las energías. Para una masa puntual:'},
            {math:String.raw`E_c=\tfrac{1}{2}m\,v^2\qquad E_p=m\,g\,h`},
            {html:'En el péndulo la masa no se mueve en línea recta sino sobre un arco. Para usar esas fórmulas hay que identificar primero <strong>(1)</strong> la velocidad tangencial <em>v</em> cuando el ángulo cambia con velocidad angular <em>ω</em>, y <strong>(2)</strong> cuánto sube la masa cuando la varilla forma un ángulo <em>θ</em>, tomando como referencia la posición más baja (h = 0).'},
            {html:'Pista — para un punto sobre un brazo rígido de longitud <em>r</em> que gira alrededor de un pivote, la longitud de arco recorrida es:'},
            {math:String.raw`s=r\cdot\theta`},
            {html:'La velocidad tangencial es la derivada temporal de esa longitud de arco, <em>v</em><sub>t</sub> = d<em>s</em>/d<em>t</em>. Para la altura <em>h</em>, mirá la geometría del péndulo y aplicá trigonometría básica.'},
            {html:'Una vez que tenemos <em>v</em> y <em>h</em>, la energía mecánica total es simplemente la suma:'},
            {math:String.raw`E_m=E_c+E_p`}
          ],
          instructions:[
            {html:'Objetivo: a partir del diagrama de bloques de OpenModelica que ya armaste (con <em>θ</em> y <em>ω</em>), <strong>extendelo agregando los bloques necesarios</strong> para calcular la energía cinética <em>E<sub>c</sub></em>, la energía potencial <em>E<sub>p</sub></em> y la energía mecánica total <em>E<sub>m</sub></em>. Después <strong>simulá el sistema y analizá cómo evolucionan <em>E<sub>c</sub></em>, <em>E<sub>p</sub></em> y <em>E<sub>m</sub></em> en el tiempo</strong> para <em>b</em> = 0, un <em>b</em> chico y un <em>b</em> grande.'}
          ],
          questions:[
            {type:'qcm',id:'p2_energy_extrema',label:'Durante la oscilación, ¿qué ocurre con los máximos y mínimos de Ec y Ep?',options:[
              ['together','Ec y Ep alcanzan sus máximos en el mismo instante.'],
              ['ec_bigger','Ec es siempre mayor que Ep durante todo el movimiento.'],
              ['exchange','Cuando Ec alcanza un máximo, Ep alcanza un mínimo (y viceversa): la energía se intercambia entre ambas.'],
              ['constant','Ec y Ep son siempre constantes: no tienen máximos ni mínimos.']
            ],answer:'exchange'},
            {type:'qcm',id:'p2_energy_b_zero',label:'¿Qué ocurre con la energía mecánica total Em si b = 0?',options:[
              ['grows','Crece con el tiempo.'],
              ['conserved','Se conserva (constante en el tiempo), intercambiándose entre cinética y potencial.'],
              ['decays','Decae exponencialmente.'],
              ['zero','Es siempre cero.']
            ],answer:'conserved'},
            {type:'qcm',id:'p2_energy_b_positive',label:'¿Qué ocurre con la energía mecánica total Em si b > 0?',options:[
              ['constant','Se mantiene constante, igual que con b = 0.'],
              ['grows','Aumenta porque b inyecta energía.'],
              ['random','Se vuelve aleatoria.'],
              ['decreases','Disminuye con el tiempo porque el amortiguamiento disipa energía.']
            ],answer:'decreases'}
          ],
          success:{html:'Correcto. Energía cinética y potencial se alternan (una está en su máximo cuando la otra está en su mínimo) para cualquier valor de <em>b</em>. Con <em>b</em> = 0 el total <em>E<sub>m</sub></em> = <em>E<sub>c</sub></em> + <em>E<sub>p</sub></em> se mantiene constante; con <em>b</em> &gt; 0 el amortiguamiento disipa energía y <em>E<sub>m</sub></em> disminuye con el tiempo.'},
          resources:[]
        },
        {
          id:'p2-paper-damper',
          requiresValidation:true,
          title:'Accesorio de freno con papel',
          kicker:'Parte 2 - Paso 3',
          subtitle:'Compará una superficie de papel pequeña y una grande.',
          instructions:[
            'Usá el accesorio que sostiene una hoja de papel en el péndulo, si está disponible.',
            'Probá dos casos: una superficie de papel pequeña y una superficie de papel grande.',
            'Registrá u observá qué tan rápido decae la amplitud en ambos casos.'
          ],
          questions:[
            {type:'qcm',id:'p2_paper_decay',label:'¿Qué debería pasar con una hoja de papel más grande?',options:[
              ['slower','La amplitud debería decaer más lento porque la hoja almacena energía.'],
              ['same','El decaimiento debería ser exactamente igual que con una hoja pequeña.'],
              ['faster','La amplitud debería decaer más rápido porque aumenta la resistencia del aire.'],
              ['period_zero','El período se vuelve cero.']
            ],answer:'faster'},
            {type:'qcm',id:'p2_paper_model',label:'En el modelo viscoso simplificado, ¿qué parámetro representa principalmente este efecto?',options:[
              ['g','La aceleración de la gravedad g.'],
              ['theta0','Solamente el ángulo inicial θ(0).'],
              ['time','El tiempo final de simulación.'],
              ['b','El coeficiente de amortiguamiento b.']
            ],answer:'b'}
          ],
          success:'Correcto. Una hoja más grande aumenta el frenado aerodinámico, entonces la oscilación pierde energía más rápido.',
          resources:[{label:'Abrir Adquisición',tab:'acq'}]
        },
        {
          id:'p2-sinusoidal-fit',
          requiresValidation:true,
          title:'Ajuste sinusoidal',
          kicker:'Parte 2 - Paso 4',
          subtitle:'Ajustá el movimiento registrado con una sinusoide amortiguada.',
          intro:[
            {html:'En esta etapa vamos a ajustar los datos experimentales a un modelo matemático. Ajustar (o "fitear") significa encontrar los valores de los parámetros constantes de una ecuación para que la curva resultante se parezca lo más posible a tus mediciones reales.'},
            {html:'El modelo que usamos es una <strong>sinusoide con decaimiento exponencial</strong>:'},
            {math:String.raw`\theta(t) = A \cdot e^{-\delta t} \cdot \sin(\omega t - \phi) + B`},
            {html:'Esta elección no es por casualidad y tiene una razón física que el docente explicará durante la sesión de TP (¡pregúntenle!). Los parámetros de esta función están relacionados con los parámetros físicos del péndulo (masa, coeficiente de frotamiento, L, gravedad).'},
            {html:'Sin embargo, esta fórmula es una aproximación y puede no adaptarse perfectamente a todo el rango de oscilación.'},
            {html:'<strong>Objetivo:</strong> Descubrir en qué zona (ángulos grandes o ángulos pequeños) el modelo matemático describe mejor la realidad.'},
            {html:'Para medir la "fidelidad" del ajuste, usamos el coeficiente <strong>R²</strong>. Podés encontrar una explicación detallada haciendo clic en el botón [?] junto al valor de R² en la herramienta de análisis.'}
          ],
          instructions:[
            'Cargá tu CSV experimental o usá los datos de adquisición actuales.',
            'Abrí la herramienta de "Ajuste sinusoidal".',
            'Probá fitear la curva en distintas zonas: primero al principio (ángulos grandes) y luego más adelante (ángulos pequeños).',
            'Compará los valores de R² y observá si la envolvente punteada sigue bien los picos en ambos casos.',
            'Abrí la ayuda de R² si hace falta antes de responder.'
          ],
          questions:[
            {type:'qcm',id:'p2_fit_small_angle',label:'¿En qué rango de ángulos se obtuvo un mejor ajuste (R² más alto)?',options:[
              ['large','Grandes ángulos (al inicio del registro).'],
              ['inter','Solo ángulos intermedios (entre 60° y 45°).'],
              ['small','Pequeños ángulos (hacia el final del registro).'],
              ['mixed','Grandes oscilaciones y pequeñas (menos de 10°), pero en el medio no funciona.']
            ],answer:'small'},
            {type:'qcm',id:'p2_fit_r2',label:'Si el ajuste tiene un R² alto y residuos pequeños en la ventana elegida, ¿qué podemos concluir?',options:[
              ['exact_global','El mismo ajuste describe necesariamente todas las amplitudes y todos los datos futuros de manera exacta.'],
              ['good_window','La sinusoide amortiguada elegida describe bien esa ventana de datos.'],
              ['no_damping','El péndulo no tiene amortiguamiento.']
            ],answer:'good_window'},
            {type:'qcm',id:'p2_fit_residuals',label:'En el cálculo de R², ¿qué es un residuo?',options:[
              ['mean','El valor medio de θ en todo el experimento.'],
              ['period','El tiempo entre dos cruces por cero.'],
              ['difference','La diferencia punto a punto θ_{data}(t_k) - θ_{fit}(t_k).']
            ],answer:'difference'},
            {type:'qcm',id:'p2_fit_square',label:'¿Por qué elevamos los residuos al cuadrado antes de sumarlos?',options:[
              ['units','Para que el resultado tenga unidades de segundos.'],
              ['linearize','Para linealizar sin(θ).'],
              ['cancel','Para que los errores positivos y negativos no se cancelen entre sí.']
            ],answer:'cancel'},
            {type:'qcm',id:'p2_fit_negative_r2',label:'¿Qué significa un R² negativo?',options:[
              ['perfect','El ajuste es perfecto pero la fase es negativa.'],
              ['worse_lazy','El modelo ajustado es peor que el modelo perezoso que predice siempre el ángulo medio.'],
              ['no_units','R² no tiene unidades, entonces los valores negativos no tienen sentido.']
            ],answer:'worse_lazy'}
          ],
          success:'Correcto. El ajuste sinusoidal da una descripción experimental compacta del movimiento a pequeños ángulos: período, frecuencia, amortiguamiento, fase y offset en una sola curva.',
          resources:[{label:'Abrir Ajuste sinusoidal',tab:'post',panel:'fit'}]
        },
        {
          id:'p2-system-identification',
          requiresValidation:true,
          title:'Identificación de sistema',
          kicker:'Parte 2 - Paso 5',
          subtitle:'Ajustá parámetros físicos comparando un modelo ODE con la medición.',
          intro:[
            {html:'En el paso anterior ajustamos una sinusoide amortiguada — una curva matemática elegida porque se parece al movimiento. Acá damos un salto: en vez de ajustar una curva, ajustamos las <strong>constantes físicas del péndulo</strong> (longitud y amortiguamiento) dentro de su ecuación diferencial.'},
            {html:'El modelo es la ODE del péndulo con fricción viscosa lineal:'},
            {math:String.raw`\ddot{\theta} + \frac{b}{mL^2}\,\dot{\theta} + \frac{g}{L}\sin\theta = 0`},
            {html:'<strong>Identificar</strong> el sistema es preguntarle a los datos: <em>¿qué valores de L y de amortiguamiento hacen que esta ecuación, simulada en el tiempo, reproduzca lo mejor posible la θ(t) medida?</em>'},
            {html:'Estamos haciendo identificación de <strong>caja gris</strong>: la forma de la ecuación viene de la física, pero también estamos suponiendo simplificaciones (fricción viscosa lineal, masa puntual, varilla rígida sin masa) que pueden no ser exactas. Por eso, al leer el resultado: un buen ajuste indica que la estructura simplificada es razonable en ese rango; un mal ajuste suele significar que al modelo le falta física (fricción seca, arrastre aerodinámico, inercia de la varilla), no solo "números mejores".'},
            {html:'Una sutileza importante: a partir de θ(t) solamente, los datos <strong>no pueden separar</strong> b y m — solo se identifica el cociente b/(mL²). Para convertir ese cociente en un b absoluto hay que <strong>medir o suponer</strong> una masa.'},
            {html:'Resultado: en lugar de A, ω, δ, φ (parámetros de una curva), obtenemos <strong>L</strong> y <strong>b/(mL²)</strong> — números con significado mecánico directo. Para una discusión más amplia (caja negra/blanca/gris, cómo trabaja el algoritmo), abrí el botón <strong>💡 ¿Qué estamos identificando?</strong> dentro de la herramienta de análisis.'}
          ],
          instructions:[
            'Abrí el análisis de Identificación de sistema sobre los mismos datos.',
            'Elegí un tiempo de inicio y una duración donde la señal medida sea limpia y representativa.',
            'Lanzá la identificación y compará θ_data(t) con θ_model(t). Después leé la longitud L identificada y los parámetros equivalentes de amortiguamiento.'
          ],
          questions:[
            {type:'qcm',id:'p2_sysid_vs_fit',label:'¿Cuál es la diferencia principal entre el ajuste sinusoidal y la identificación de sistema acá?',options:[
              ['same','Son exactamente el mismo cálculo con nombres distintos.'],
              ['visual','La identificación solo cambia el color de la curva medida.'],
              ['ode','La identificación simula la ODE del péndulo y ajusta parámetros físicos para que el modelo siga los datos.'],
              ['manual','La identificación no usa datos medidos.']
            ],answer:'ode'},
            {type:'qcm',id:'p2_sysid_nonseparable',label:'Con θ(t) solamente, ¿por qué hay que tener cuidado al interpretar b y m por separado?',options:[
              ['no_mass','Porque la masa nunca influye en ningún modelo de péndulo.'],
              ['ratio','Porque el movimiento ve el cociente b/(mL²): distintos valores de b y m pueden dar la misma dinámica si ese cociente no cambia.'],
              ['only_b','Porque los datos identifican b exactamente pero nunca L.'],
              ['only_m','Porque los datos identifican m exactamente pero nunca b.']
            ],answer:'ratio'}
          ],
          success:'Correcto. La identificación de sistema conecta la curva medida con la ODE física. Es más exigente que un ajuste visual, pero los parámetros obtenidos tienen significado mecánico.',
          resources:[{label:'Abrir Identificación de sistema',tab:'post',panel:'sysid'}]
        },
        {
          id:'p2-torsion-spring',
          requiresValidation:true,
          hidden:true,
          title:'Agregar un resorte de torsión',
          kicker:'Parte 2 - Paso 6',
          subtitle:'Modificá el diagrama con un torque proporcional al ángulo.',
          instructions:[
            {html:'Ahora imaginá un resorte de torsión conectado al eje. Produce un torque restaurador proporcional al ángulo:'},
            {math:String.raw`\Gamma_k=-k\theta`},
            {html:'Modificá el diagrama de bloques agregando este torque a la suma de torques. Después simulá con diferentes posiciones iniciales <strong>θ(0)</strong> y compará el movimiento.'}
          ],
          questions:[
            {type:'qcm',id:'p2_spring_torque',label:'¿Qué torque hay que agregar para un resorte de torsión?',options:[
              ['spring','Γ_k = -kθ.'],
              ['viscous','Γ_k = -bω.'],
              ['gravity','Γ_k = -mgL sin(θ).'],
              ['constant','Γ_k = k, independiente del ángulo.']
            ],answer:'spring'},
            {type:'qcm',id:'p2_spring_effect',label:'¿Cuál es el efecto cualitativo de agregar un resorte de torsión restaurador?',options:[
              ['stiffer','El sistema se vuelve efectivamente más rígido, entonces la frecuencia de oscilación generalmente aumenta.'],
              ['damping','Solo agrega amortiguamiento y no puede cambiar la frecuencia.'],
              ['noise','Solo agrega ruido de medición.'],
              ['remove_gravity','Cancela la gravedad para todos los ángulos.']
            ],answer:'stiffer'}
          ],
          success:'Correcto. El resorte de torsión agrega otro torque restaurador en el diagrama de bloques, así que la dinámica cambia incluso con la misma condición inicial.',
          resources:[{label:'Abrir Adquisición y Simulación',tab:'acq'}]
        }
      ]
    }
  };

  let activeGuide=TP_DEFAULT_GUIDE;
  let tpState={active:0,unlocked:0,completed:{},answers:{}};
  let switchTab=function(){};
  let getLang=function(){return document.documentElement.lang||'EN';};
  let initialized=false;
  let forcedLang=null;
  let bypassLockedStepOnce=false;

  function normalizeLang(l){
    const code=String(l||'EN').slice(0,2).toUpperCase();
    return TP_TEXT[code]?code:'EN';
  }
  function langCode(){return normalizeLang(forcedLang||(getLang&&getLang())||'EN');}
  function text(){return TP_TEXT[langCode()]||TP_TEXT.EN;}
  function steps(){
    const t=text();
    const list=activeGuide==='part2'&&t.part2Steps?t.part2Steps:t.steps;
    return list.filter(s=>s.hidden!==true);
  }
  function freshTpState(){return {active:0,unlocked:0,completed:{},answers:{}};}
  function storageKey(){return activeGuide===TP_DEFAULT_GUIDE?TP_STORAGE_KEY:`${TP_STORAGE_KEY}_${activeGuide}`;}
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
  function isStepNavOverride(event){
    return !!(event&&event.ctrlKey&&event.shiftKey&&event.altKey);
  }

  function loadTpState(){
    try{
      tpState=freshTpState();
      const raw=localStorage.getItem(storageKey());
      if(raw)tpState={...tpState,...JSON.parse(raw)};
    }catch(_){}
    tpState.completed=tpState.completed||{};
    tpState.answers=tpState.answers||{};
    const max=steps().length-1;
    tpState.active=Math.min(tpState.active||0,max);
    tpState.unlocked=Math.min(tpState.unlocked||0,max);
  }
  function saveTpState(){localStorage.setItem(storageKey(),JSON.stringify(tpState));}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function highlightTpTerms(v){
    let html=escapeHtml(v);
    html = html.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    html = html.replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');
    html = html.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    html = html.replace(/\^([0-9a-zA-Z]+)/g, '<sup>$1</sup>');
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
    return `<p>${highlightTpTerms(v)}</p>`;
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
    document.querySelectorAll('[data-guide-id]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.guideId===activeGuide);
    });
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
      return `<button class="${cls}" type="button" data-tp-step="${i}" data-locked="${locked?'true':'false'}" aria-disabled="${locked?'true':'false'}" ${locked?'tabindex="-1"':''}>
        <span class="tp-step-index">${done?'✓':i+1}</span>
        <span class="tp-step-title">${escapeHtml(s.title)}</span>
        <span class="tp-step-status">${escapeHtml(status)}</span>
      </button>`;
    }).join('');
    list.querySelectorAll('[data-tp-step]').forEach(btn=>{
      btn.addEventListener('click',event=>{
        const locked=btn.dataset.locked==='true';
        if(locked&&!isStepNavOverride(event))return;
        bypassLockedStepOnce=locked;
        tpState.active=parseInt(btn.dataset.tpStep,10);
        saveTpState();
        renderTpAtTop();
      });
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
          <label>${highlightTpTerms(q.label)}</label>
          <div class="tp-qcm">${q.options.map(([value,label])=>`
            <label class="tp-option"><input type="radio" name="tp_${escapeHtml(q.id)}" value="${escapeHtml(value)}" ${answerValue(q.id)===value?'checked':''}><span>${highlightTpTerms(label)}</span></label>
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
    const body=step.missionProse
      ?step.instructions.map(x=>`<div class="tp-mission-item">${instructionHtml(x)}</div>`).join('')
      :`<ul>${step.instructions.map(x=>`<li>${instructionHtml(x)}</li>`).join('')}</ul>`;
    target.innerHTML=`<h3>${escapeHtml(ui.mission)}</h3>${body}`;
    target.querySelectorAll('[data-tp-modal]').forEach(btn=>{
      btn.addEventListener('click',()=>openTpModal(btn.dataset.tpModal));
    });
  }

  function renderTpIntro(step,ui){
    const target=document.getElementById('tpIntro');
    if(!target)return;
    if(!step.intro||!step.intro.length){target.style.display='none';target.innerHTML='';return;}
    target.style.display='';
    const title=step.introTitle||ui.intro;
    target.innerHTML=`<h3>${escapeHtml(title)}</h3><div class="tp-intro-body">${step.intro.map(proseHtml).join('')}</div>`;
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
    if(stepGate!==-1&&tpState.active>stepGate&&!bypassLockedStepOnce){
      tpState.active=stepGate;
      saveTpState();
    }
    bypassLockedStepOnce=false;
    const step=stepList[tpState.active];
    renderTpStaticUi();
    const mainEl=document.querySelector('.tp-main');
    if(mainEl)mainEl.classList.toggle('mission-first',!!step.missionFirst);
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

  window.setTpGuide=function setTpGuide(guideId){
    if(!TP_GUIDE_IDS.includes(guideId))return;
    if(activeGuide===guideId){
      if(initialized)renderTp();
      return;
    }
    saveTpState();
    activeGuide=guideId;
    loadTpState();
    if(initialized)renderTpAtTop();
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
        localStorage.removeItem(storageKey());
        tpState=freshTpState();
        renderTp();
      });
    });
    document.getElementById('tpExportBtn').addEventListener('click',exportTpAnswers);
  };
})();
