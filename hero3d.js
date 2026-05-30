/* -------------------------------------------------------------
 * ANALYSTOS 3D GRAPHICS SCENE - THREE.JS
 * High-performance cinematic 3D financial globe & particle networks
 * with dynamic cursor attraction physics.
 * ------------------------------------------------------------- */

import * as THREE from "three";

export function initThreeHeroScene() {
  const container = document.getElementById("hero-canvas-container");
  if (!container) {
    return;
  }

  // Width & height trackers
  let width = container.clientWidth;
  let height = container.clientHeight;

  // Scene setup
  const scene = new THREE.Scene();

  // Perspective camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 8;

  // WebGL Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Group container for complete rotation
  const sceneGroup = new THREE.Group();
  scene.add(sceneGroup);

  // ==========================================
  // 1. ROTATING WIREFRAME & POINT GLOBE
  // ==========================================
  const globeRadius = 1.6;
  const globeGroup = new THREE.Group();
  sceneGroup.add(globeGroup);

  // Outer wireframe sphere for technical terminal feel
  const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x2D7EF8,
    wireframe: true,
    transparent: true,
    opacity: 0.08
  });
  const globeWireMesh = new THREE.Mesh(sphereGeo, wireMat);
  globeGroup.add(globeWireMesh);

  // Dot matrix point globe layering
  const dotsCount = 400;
  const dotGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(dotsCount * 3);

  for (let i = 0; i < dotsCount; i++) {
    // Math to project random uniform dots on a sphere
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    
    positions[i * 3] = globeRadius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = globeRadius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = globeRadius * Math.cos(phi);
  }

  dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dotMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.025,
    transparent: true,
    opacity: 0.35
  });
  const globeDots = new THREE.Points(dotGeo, dotMat);
  globeGroup.add(globeDots);

  // ==========================================
  // 2. FINANCIAL DATA ROUTING CONNECTIONS
  // ==========================================
  const routeGroup = new THREE.Group();
  globeGroup.add(routeGroup);

  // Plot 6 glowing geographic bezier connection paths
  const connectionHubs = [
    { from: [1.2, 0.8, 0.7], to: [-0.8, -0.6, -1.1] },
    { from: [-1.4, 0.4, 0.6], to: [0.5, -1.2, 0.9] },
    { from: [0.2, 1.5, -0.4], to: [-0.9, -0.8, 1.1] },
    { from: [1.3, -0.9, -0.3], to: [-1.2, 0.9, -0.4] },
    { from: [-0.5, 1.4, 0.5], to: [1.1, -1.0, -0.7] }
  ];

  connectionHubs.forEach(hub => {
    const p1 = new THREE.Vector3(...hub.from).normalize().multiplyScalar(globeRadius);
    const p2 = new THREE.Vector3(...hub.to).normalize().multiplyScalar(globeRadius);
    
    // Middle control coordinate for bezier curves
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.7);
    midPoint.add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4
    ));

    const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
    const points = curve.getPoints(20);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

    const curveMat = new THREE.LineBasicMaterial({
      color: 0x2D7EF8,
      transparent: true,
      opacity: 0.15
    });

    const routeLine = new THREE.Line(curveGeo, curveMat);
    routeGroup.add(routeLine);
  });

  // ==========================================
  // 3. PULSING AI PARTICLE CENTERPIECE SPHERE
  // ==========================================
  const particleCount = 700;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSpeeds = [];

  const coreRadius = 0.85;

  for (let i = 0; i < particleCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    
    // Plot variables on inner core shell
    particlePositions[i * 3] = coreRadius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = coreRadius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = coreRadius * Math.cos(phi);

    // Save customized frequency variables for organic waves
    particleSpeeds.push({
      freq: Math.random() * 2 + 1,
      phase: Math.random() * Math.PI * 2
    });
  }

  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x10B981, // Pulsing success emerald green
    size: 0.03,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  const aiSphereParticles = new THREE.Points(particleGeo, particleMat);
  sceneGroup.add(aiSphereParticles);

  // ==========================================
  // 4. LIGHTING & ENVIRONMENT GLOW
  // ==========================================
  const ambientLight = new THREE.AmbientLight(0x060609, 0.8);
  scene.add(ambientLight);

  // Glowing electric blue light from centerpiece core
  const pointLight = new THREE.PointLight(0x2D7EF8, 3, 15);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  // Directional lighting from top corner
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 5, 4);
  scene.add(directionalLight);

  // ==========================================
  // 5. MOUSE INTERACTION TRACKERS
  // ==========================================
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener("mousemove", (event) => {
    // Normalized mouse coordinates
    mouseX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    mouseY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  });

  // ==========================================
  // 6. ANIMATION RENDERING ENGINE LOOP
  // ==========================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Rotate Globe
    globeGroup.rotation.y = time * 0.05;
    globeGroup.rotation.x = time * 0.02;

    // Pulse core particles organic size and shape
    const positionsArr = aiSphereParticles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const x = positionsArr[i * 3];
      const y = positionsArr[i * 3 + 1];
      const z = positionsArr[i * 3 + 2];

      const length = Math.sqrt(x*x + y*y + z*z);
      if (length === 0) {
        continue;
      }

      // Normalized vector
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;

      // Apply organic sine scale pulses
      const speed = particleSpeeds[i];
      const pulseFactor = coreRadius + Math.sin(time * speed.freq + speed.phase) * 0.045;

      positionsArr[i * 3] = nx * pulseFactor;
      positionsArr[i * 3 + 1] = ny * pulseFactor;
      positionsArr[i * 3 + 2] = nz * pulseFactor;
    }
    aiSphereParticles.geometry.attributes.position.needsUpdate = true;

    // Twist AI sphere opposite globe rotation
    aiSphereParticles.rotation.y = -time * 0.03;
    aiSphereParticles.rotation.z = time * 0.01;

    // Lerp rotation coordinates towards cursor target
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    // Camera tilts following cursor
    sceneGroup.rotation.y = targetX * 0.25;
    sceneGroup.rotation.x = targetY * 0.2;

    renderer.render(scene, camera);
  }

  animate();

  // ==========================================
  // 7. RESPONSIVE RESIZE LISTENER
  // ==========================================
  window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}
