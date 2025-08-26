// encoder_svg.js
// Función única y reutilizable para generar el SVG del disco encoder.
function buildEncoderSVG(options = {}) {
  const {
    n = 8,
    duty = 0.5,
    Rext = 120,
    Rcore = 18,
    A_in = 50, A_out = 70,
    B_in = 80, B_out = 100,
    notchAngleDeg = 0,
    notchWidthDeg = 12,
    notchDepth = 7,
    viewMarginRatio = 0.08,
    fillColor = "#554691", // color inicial solicitado
    width = 360,
    height = 360,
    showOutlines = false,
  } = options;

  if (!(n >= 1)) throw new Error("n must be >= 1");
  const TAU = Math.PI * 2;
  const eps = 1e-3;
  const d = Math.min(1 - eps, Math.max(eps, duty));
  const thetaP = TAU / n;
  const offsetB = thetaP / 4; // 90° eléctricos

  const RextSafe = Math.max(Rext, A_out + 2, B_out + 2);
  const Rmax = Math.max(RextSafe, A_out, B_out);
  const margin = viewMarginRatio * Rmax;
  const minc = -(Rmax + margin);
  const size = 2 * (Rmax + margin);
  const viewBox = `${num(minc)} ${num(minc)} ${num(size)} ${num(size)}`;

  // Muesca: sin borde visible contra el agujero central (notchRin = Rcore)
  let notchRin = Rcore;
  let notchRout = Rcore + notchDepth;
  if (A_in > 0 && notchRout > A_in) notchRout = (A_in + Rcore) / 2;
  if (notchRout <= notchRin + 1e-6) notchRout = notchRin + 1;

  const parts = [];
  parts.push(circleSubpath(RextSafe));
  if (Rcore > 0) parts.push(circleSubpath(Rcore));
  parts.push(annularSectorSubpath(
    notchRin, notchRout,
    deg2rad(notchAngleDeg) - deg2rad(notchWidthDeg)/2,
    deg2rad(notchAngleDeg) + deg2rad(notchWidthDeg)/2
  ));
  for (let k = 0; k < n; k++) {
    const t0 = k * thetaP, t1 = t0 + d * thetaP;
    parts.push(annularSectorSubpath(A_in, A_out, t0, t1));
  }
  for (let k = 0; k < n; k++) {
    const t0 = k * thetaP + offsetB, t1 = t0 + d * thetaP;
    parts.push(annularSectorSubpath(B_in, B_out, t0, t1));
  }

  const pathD = parts.join(" ");
  const outlines = showOutlines ? [
    circleOutline(RextSafe),
    Rcore > 0 ? circleOutline(Rcore) : "",
    circleOutline(A_in), circleOutline(A_out),
    circleOutline(B_in), circleOutline(B_out),
  ].join("") : "";

  const sizeAttrs = (width && height) ? ` width="${width}" height="${height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttrs} viewBox="${viewBox}">
  <g transform="translate(0,0)">
    <path d="${pathD}" fill="${fillColor}" fill-rule="evenodd" stroke="none"/>
    ${outlines}
  </g>
</svg>`;

  // Helpers
  function num(x){ return Number.isInteger(x) ? String(x) : x.toFixed(3).replace(/\.?0+$/,""); }
  function deg2rad(deg){ return deg * Math.PI / 180; }
  function polar(R, th){ return [R * Math.cos(th), R * Math.sin(th)]; }
  function moveTo(x,y){ return `M ${num(x)} ${num(y)}`; }
  function lineTo(x,y){ return `L ${num(x)} ${num(y)}`; }
  function arcTo(R, largeArc, sweep, x, y){ return `A ${num(R)} ${num(R)} 0 ${largeArc} ${sweep} ${num(x)} ${num(y)}`; }
  function arcFlagsCCW(delta){ const d=((delta%(TAU))+TAU)%TAU; return [d>Math.PI?1:0, 1]; }
  function arcFlagsCW(delta){  const d=((delta%(TAU))+TAU)%TAU; return [d>Math.PI?1:0, 0]; }
  function circleSubpath(R){
    const x0=R, y0=0, x1=-R, y1=0;
    return `${moveTo(x0,y0)} ${arcTo(R,1,1,x1,y1)} ${arcTo(R,1,1,x0,y0)} Z`;
  }
  function annularSectorSubpath(Rin, Rout, t0, t1){
    const dtheta = ((t1 - t0) % TAU + TAU) % TAU;
    const [x0,y0] = polar(Rout, t0);
    const [x1,y1] = polar(Rout, t1);
    const [largeCCW, sweepCCW] = arcFlagsCCW(dtheta);
    const [xi1,yi1] = polar(Rin, t1);
    const [xi0,yi0] = polar(Rin, t0);
    const [largeCW, sweepCW] = arcFlagsCW(dtheta);
    return [
      moveTo(x0,y0),
      arcTo(Rout, largeCCW, sweepCCW, x1, y1),
      lineTo(xi1, yi1),
      arcTo(Rin, largeCW, sweepCW, xi0, yi0),
      lineTo(x0, y0),
      "Z"
    ].join(" ");
  }
  function circleOutline(R){
    if (!(R>0)) return "";
    return `<circle cx="0" cy="0" r="${num(R)}" fill="none" stroke="#888" stroke-width="0.6" vector-effect="non-scaling-stroke"/>`;
  }
}
