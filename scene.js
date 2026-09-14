export async function mountScene(host, options = {}) {
  const THREE = await import(
    "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"
  );

  if (!host.isConnected) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");
  const compact = matchMedia("(max-width: 760px)");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.5, 8.8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !compact.matches,
    powerPreference: "low-power"
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.7)
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 2));

  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(3, 5, 6);
  scene.add(key);

  const rim = new THREE.PointLight(options.accent || "#79b4ff", 35);
  rim.position.set(-3, 2, 3);
  scene.add(rim);

  const root = new THREE.Group();
  root.position.set(-0.45, -0.4, 0);
  scene.add(root);

  const materials = [];

  function material(color, metalness = 0.3, roughness = 0.3) {
    const value = new THREE.MeshStandardMaterial({
      color, metalness, roughness
    });
    materials.push(value);
    return value;
  }

  const dark = material("#182133", 0.7, 0.25);
  const edge = material("#43546f", 0.75, 0.2);
  const screen = material("#0d1728", 0.15, 0.35);
  const blue = material(options.accent || "#79b4ff");
  const violet = material(options.secondary || "#ae9bff");
  const grey = material("#63718a");

  function box(parent, width, height, depth, mat, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      mat
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  const monitor = new THREE.Group();
  monitor.rotation.set(-0.08, 0.3, -0.05);
  monitor.position.set(-0.25, 0.25, 0);
  root.add(monitor);

  box(monitor, 2.7, 1.7, 0.16, edge, 0, 0.35, 0);
  box(monitor, 2.53, 1.52, 0.05, screen, 0, 0.35, 0.11);

  // Abstract interface geometry; no hardcoded visible wording.
  box(monitor, 0.55, 1.29, 0.02, dark, -0.9, 0.35, 0.15);
  box(monitor, 0.3, 0.06, 0.02, blue, -0.9, 0.85, 0.18);

  for (let i = 0; i < 4; i++) {
    box(monitor, 0.3, 0.035, 0.02, grey, -0.9, 0.62 - i * 0.2, 0.18);
  }

  box(monitor, 1.32, 0.1, 0.02, blue, 0.25, 0.87, 0.16);
  box(monitor, 0.86, 0.045, 0.02, grey, 0.02, 0.65, 0.16);

  for (let i = 0; i < 3; i++) {
    box(
      monitor, 0.38, 0.57, 0.03,
      i === 1 ? violet : dark,
      -0.22 + i * 0.47, 0.17, 0.17
    );
  }

  box(monitor, 0.16, 0.5, 0.15, edge, 0, -0.72, -0.04);
  box(monitor, 1.1, 0.09, 0.62, dark, 0, -0.99, 0.05);

  const phone = new THREE.Group();
  phone.position.set(1.05, -0.2, 0.9);
  phone.rotation.set(0.1, -0.4, 0.14);
  root.add(phone);

  box(phone, 0.87, 1.65, 0.14, edge, 0, 0, 0);
  box(phone, 0.75, 1.48, 0.025, screen, 0, 0, 0.09);
  box(phone, 0.2, 0.035, 0.02, dark, 0, 0.65, 0.12);
  box(phone, 0.49, 0.08, 0.02, blue, 0, 0.42, 0.12);
  box(phone, 0.52, 0.43, 0.02, violet, 0, 0.07, 0.12);
  box(phone, 0.48, 0.04, 0.02, grey, 0, -0.29, 0.12);
  box(phone, 0.35, 0.04, 0.02, grey, -0.065, -0.43, 0.12);
  box(phone, 0.45, 0.09, 0.02, blue, 0, -0.6, 0.12);

  const base = box(root, 3.65, 0.09, 1.9, dark, 0, -1.1, 0);
  base.rotation.y = 0.18;

  let frame = 0;
  let inView = true;
  let disposed = false;
  let targetX = 0;
  let targetY = 0;

  const animate = () =>
    options.motion !== false && !reduced.matches;

  function draw(time = 0) {
    frame = 0;
    if (disposed || !inView || document.hidden) return;

    if (animate()) {
      root.rotation.y += (targetX * 0.16 - root.rotation.y) * 0.045;
      root.rotation.x += (-targetY * 0.09 - root.rotation.x) * 0.045;
      root.position.y = -0.4 + Math.sin(time * 0.0006) * 0.055;
    } else {
      root.rotation.set(0, 0, 0);
      root.position.y = -0.4;
    }

    renderer.render(scene, camera);

    if (animate()) frame = requestAnimationFrame(draw);
  }

  function wake() {
    if (!frame && !disposed && inView && !document.hidden) {
      frame = requestAnimationFrame(draw);
    }
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || disposed) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    wake();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  const visibilityObserver = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) wake();
    else pause();
  });
  visibilityObserver.observe(host);

  const pointerArea = host.closest(".hero") || host;

  function pointer(event) {
    if (!finePointer.matches || !animate() ||
        options.parallax === false) return;

    const rect = pointerArea.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function resetPointer() {
    targetX = targetY = 0;
  }

  function pageVisibility() {
    if (document.hidden) pause();
    else wake();
  }

  function motionChanged() {
    pause();
    wake();
  }

  pointerArea.addEventListener("pointermove", pointer, { passive: true });
  pointerArea.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", pageVisibility);
  reduced.addEventListener("change", motionChanged);

  renderer.domElement.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    pause();
  });

  renderer.domElement.addEventListener("webglcontextrestored", wake);

  function dispose() {
    disposed = true;
    pause();

    resizeObserver.disconnect();
    visibilityObserver.disconnect();

    pointerArea.removeEventListener("pointermove", pointer);
    pointerArea.removeEventListener("pointerleave", resetPointer);
    document.removeEventListener("visibilitychange", pageVisibility);
    reduced.removeEventListener("change", motionChanged);

    scene.traverse(object => object.geometry?.dispose());
    materials.forEach(value => value.dispose());
    renderer.dispose();
  }

  // Do not dispose a page that the browser is preserving in its back cache.
  window.addEventListener("pagehide", event => {
    if (!event.persisted) dispose();
  }, { once: true });

  resize();
}