/* script.js */

// Global variables for Three.js setup
let scene, camera, renderer, composer, dofPass;
let nodes = [];
let lines;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let infoPanel;
let isHovering = false;
let mouseTrail;

// Initialize the 3D scene
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup (Perspective for depth)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 80;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl-canvas'), antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // EffectComposer for post-processing
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Depth of Field Pass
    dofPass = new THREE.DepthOfFieldPass(scene, camera, {
        focus: 40.0, // Initial focus distance
        aperture: 0.025, // Blur amount
        maxblur: 1.0 // Maximum blur radius
    });
    composer.addPass(dofPass);

    // Create 16 nodes and arrange them in 3D volume
    for (let i = 0; i < 16; i++) {
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xFF1493, emissive: 0xFF1493 });
        const sphere = new THREE.Mesh(geometry, material);
        nodes.push(sphere);
        scene.add(sphere);

        // Scatter nodes randomly with emphasis on Z-depth
        sphere.position.x = (Math.random() - 0.5) * 50;
        sphere.position.y = (Math.random() - 0.5) * 30;
        sphere.position.z = (Math.random() - 1) * 60; // Larger Z range for depth

        // Add user data for info panel
        sphere.userData = {
            curator: i === 0 ? "JAKE LEE" : `CURATOR ${i + 1}`,
            theme: i === 0 ? '"NEON FRONTIERS"' : `"THEME ${i + 1}"`
        };
    }

    // Create lines between all nodes
    const linesGeometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 16; i++) {
        for (let j = i + 1; j < 16; j++) {
            const p1 = nodes[i].position;
            const p2 = nodes[j].position;
            positions.push(p1.x, p1.y, p1.z);
            positions.push(p2.x, p2.y, p2.z);
        }
    }
    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0xFF1493, opacity: 0.5, transparent: true });
    lines = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(lines);

    // Mouse Trail (Particle System)
    const trailGeometry = new THREE.BufferGeometry();
    const trailVertices = [];
    for (let i = 0; i < 50; i++) {
        trailVertices.push(0, 0, 0);
    }
    trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailVertices, 3));
    const trailMaterial = new THREE.PointsMaterial({ color: 0xFF1493, size: 0.5, transparent: true, blending: THREE.AdditiveBlending });
    mouseTrail = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(mouseTrail);

    // UI elements
    infoPanel = document.getElementById('info-panel');

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    // Start animation loop
    animate();
}

// Handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Track mouse movement for interaction and trail
function onMouseMove(event) {
    // Normalize mouse coordinates for raycasting (-1 to 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update mouse trail position in world coordinates
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = - camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    // Smoothly update trail particles
    const positions = mouseTrail.geometry.attributes.position.array;
    for (let i = positions.length - 1; i >= 3; i--) {
        positions[i] = positions[i-3];
    }
    positions[0] = pos.x;
    positions[1] = pos.y;
    positions[2] = pos.z;
    mouseTrail.geometry.attributes.position.needsUpdate = true;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Pulsing effect for nodes
    const time = Date.now() * 0.001;
    nodes.forEach(node => {
        const speed = isHovering && node === nodes[0] ? 3 : 1; // Faster pulsing on hover
        node.material.emissiveIntensity = 1 + Math.sin(time * speed) * 0.5;
    });

    // Raycasting for hover interaction
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
        if (!isHovering) {
            isHovering = true;
            infoPanel.classList.remove('hidden');
            // Update info panel content
            const sphere = intersects[0].object;
            document.getElementById('curator-name').textContent = sphere.userData.curator;
            document.getElementById('theme-name').textContent = sphere.userData.theme;
            
            // Adjust DoF focus temporarily on hover (optional, adds more dynamism)
            dofPass.uniforms[ "focus" ].value = sphere.position.z + camera.position.z;
        }
        // Expand the intersected node
        intersects[0].object.scale.set(1.5, 1.5, 1.5);
    } else {
        if (isHovering) {
            isHovering = false;
            infoPanel.classList.add('hidden');
            // Reset DoF focus
            dofPass.uniforms[ "focus" ].value = 40.0;
        }
        // Reset all nodes to original scale
        nodes.forEach(node => node.scale.set(1, 1, 1));
    }

    // (Optional) Slow scene rotation for extra depth feel
    // scene.rotation.y += 0.001;
    
    // Composite the scene with DoF
    composer.render();
}

// Initialize everything on window load
window.onload = init;
