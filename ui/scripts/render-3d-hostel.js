/**
 * 3D Interactive Hostel Campus & Floor Plan Visualizer (Three.js WebGL Engine)
 * Theme: Sahara Design System (#C2652A, #FAF4EC, #F4EBE1, #8C3C3C, #4A7C59)
 */

(function (window, document) {
  'use strict';

  let scene, camera, renderer, controls;
  let roomObjects = [];
  let raycaster, mouse;
  let hoveredObject = null;
  let animationFrameId = null;
  let isAutoRotating = false;

  function init3DHostelVisualizer() {
    const container = document.getElementById('hostel-3d-canvas-container');
    if (!container) return;

    // Clear existing canvas elements
    container.innerHTML = '';

    const width = container.clientWidth || 800;
    const height = 480;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F3);
    scene.fog = new THREE.FogExp2(0xFBF8F3, 0.015);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(28, 22, 38);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls Setup
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
      controls.minDistance = 10;
      controls.maxDistance = 80;
      controls.target.set(0, 4, 0);
    }

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xFFF7ED, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFFAF0, 1.1);
    sunLight.position.set(30, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xC2652A, 0.25);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // 6. Ground Plane Setup
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xEBE1D5,
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 40, 0xC2652A, 0xD9CEBF);
    grid.position.y = 0.01;
    scene.add(grid);

    // 7. Raycaster & Mouse Setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 8. Build 3D Building Layout
    build3DHostelBlocks();

    // 9. Event Listeners & ResizeObserver
    renderer.domElement.addEventListener('mousemove', on3DMouseMove, false);
    renderer.domElement.addEventListener('click', on3DMouseClick, false);
    window.addEventListener('resize', on3DWindowResize, false);

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(function() {
        on3DWindowResize();
      });
      resizeObserver.observe(container);
    }

    // 10. Start Animation Loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animate3D();
  }

  function build3DHostelBlocks() {
    // Clear & dispose any previously rendered 3D room objects from scene
    if (Array.isArray(roomObjects)) {
      roomObjects.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
        if (scene) scene.remove(obj);
      });
    }
    roomObjects = [];

    // Fetch live room inventory from state, LocalMockDB, or mockStore
    let rawRooms = [];
    if (window.state && Array.isArray(window.state.rooms) && window.state.rooms.length > 0) {
      rawRooms = window.state.rooms;
    } else if (window.LocalMockDB && Array.isArray(window.LocalMockDB.rooms) && window.LocalMockDB.rooms.length > 0) {
      rawRooms = window.LocalMockDB.rooms;
    } else if (window.mockStore && typeof window.mockStore.getRooms === 'function') {
      rawRooms = window.mockStore.getRooms() || [];
    }

    let rooms = rawRooms.map(r => {
      const roomNum = r['Room Number'] || r['Room ID'] || r.number || r.id || 'Room';
      const blockName = r['Block'] || r['Block Name'] || r['Hostel Block'] || r.block || 'Block A';
      const floorLevel = r['Floor'] || r['Floor Level'] || r.floor || '1st Floor';
      const roomType = r['Room Type'] || r['Room Category'] || r.type || 'Standard';
      const capacity = parseInt(r['Capacity'] || r['Total Capacity'] || r.capacity || 1, 10);
      
      let occupancy = 0;
      if (r['Current Occupancy'] !== undefined && r['Current Occupancy'] !== null) {
        occupancy = parseInt(r['Current Occupancy'], 10);
      } else if (r['Allocated Students Count'] !== undefined && r['Allocated Students Count'] !== null) {
        occupancy = parseInt(r['Allocated Students Count'], 10);
      } else if (r.allocatedCount !== undefined) {
        occupancy = parseInt(r.allocatedCount, 10);
      } else if (window.state && Array.isArray(window.state.allocations)) {
        const roomIdStr = String(r['Room ID'] || roomNum).toLowerCase();
        occupancy = window.state.allocations.filter(a => String(a['Room ID'] || a['Allocated Room'] || '').toLowerCase() === roomIdStr).length;
      }

      const rent = r['Monthly Rent (INR)'] || r['Monthly Rent'] || r.rent || 5000;
      const status = r['Status'] || (occupancy >= capacity ? 'Full' : occupancy > 0 ? 'Partial' : 'Available');

      return {
        id: r['Room ID'] || roomNum,
        number: roomNum,
        block: blockName,
        floor: String(floorLevel).includes('Floor') ? floorLevel : `Floor ${floorLevel}`,
        type: roomType,
        capacity: capacity,
        allocatedCount: occupancy,
        rent: rent,
        status: status
      };
    });

    if (!rooms.length) return;

    // Group rooms by Block & Floor
    const blocksMap = {};
    rooms.forEach(r => {
      const bKey = r.block || 'Main Block';
      if (!blocksMap[bKey]) blocksMap[bKey] = [];
      blocksMap[bKey].push(r);
    });

    const blockKeys = Object.keys(blocksMap);
    const roomWidth = 3.6;
    const roomHeight = 2.6;
    const roomDepth = 3.6;
    const spacing = 0.5;
    const maxRoomsPerRow = 6; // Max 6 rooms per row on each floor before wrapping

    // Calculate max depth required for multi-row floor slabs
    let maxBlockDepth = roomDepth;
    blockKeys.forEach(bKey => {
      const bRooms = blocksMap[bKey];
      const floorCounts = {};
      bRooms.forEach(r => {
        let fNum = 1;
        const match = String(r.floor || r.number || '').match(/\d+/);
        if (match) {
          const digits = match[0];
          fNum = digits.length >= 3 ? parseInt(digits[0], 10) : parseInt(digits, 10);
        }
        floorCounts[fNum] = (floorCounts[fNum] || 0) + 1;
      });
      const maxFCount = Math.max(...Object.values(floorCounts), 1);
      const rows = Math.ceil(maxFCount / maxRoomsPerRow);
      const depth = rows * (roomDepth + 1.2);
      if (depth > maxBlockDepth) maxBlockDepth = depth;
    });

    const blockWidth = Math.min(6, maxRoomsPerRow) * (roomWidth + spacing) + 3;
    const blockSpacing = Math.max(22, blockWidth + 6);
    const startX = -((blockKeys.length - 1) * blockSpacing) / 2;

    blockKeys.forEach((bKey, bIndex) => {
      const bRooms = blocksMap[bKey];
      const blockX = startX + bIndex * blockSpacing;

      // Group rooms in this block by Floor level
      const floorMap = {};
      bRooms.forEach(r => {
        let fNum = 1;
        const match = String(r.floor || r.number || '').match(/\d+/);
        if (match) {
          const digits = match[0];
          if (digits.length >= 3) fNum = parseInt(digits[0], 10);
          else fNum = parseInt(digits, 10);
        }
        if (!floorMap[fNum]) floorMap[fNum] = [];
        floorMap[fNum].push(r);
      });

      const floorNums = Object.keys(floorMap).sort((a, b) => a - b);

      // Build 3D Block Signboard Header
      createBlockHeaderSign(bKey, blockX, floorNums.length * (roomHeight + 0.6) + 2.5);

      floorNums.forEach((fKey, fIndex) => {
        const fRooms = floorMap[fKey];
        const yPos = 0.2 + fIndex * (roomHeight + 0.6);

        const totalRoomsOnFloor = fRooms.length;
        const rowCount = Math.ceil(totalRoomsOnFloor / maxRoomsPerRow);
        const maxColsOnFloor = Math.min(totalRoomsOnFloor, maxRoomsPerRow);

        // Floor Slab Geometry
        const slabWidth = maxColsOnFloor * (roomWidth + spacing) + 1.8;
        const slabDepth = rowCount * (roomDepth + 1.2) + 1.8;
        const slabGeo = new THREE.BoxGeometry(slabWidth, 0.4, slabDepth);
        const slabMat = new THREE.MeshStandardMaterial({ color: 0xD9CEBF, roughness: 0.6 });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(blockX, yPos, 0);
        slab.receiveShadow = true;
        slab.castShadow = true;
        scene.add(slab);

        // Render 3D Rooms in grid rows (max 6 rooms per row)
        fRooms.forEach((room, rIndex) => {
          const rowIndex = Math.floor(rIndex / maxRoomsPerRow);
          const colIndex = rIndex % maxRoomsPerRow;
          const itemsInThisRow = Math.min(maxRoomsPerRow, totalRoomsOnFloor - rowIndex * maxRoomsPerRow);

          const rowStartX = blockX - ((itemsInThisRow - 1) * (roomWidth + spacing)) / 2;
          const rx = rowStartX + colIndex * (roomWidth + spacing);
          const ry = yPos + 0.2 + roomHeight / 2;

          // Center Z position for multi-row layout
          const zOffset = (rowIndex - (rowCount - 1) / 2) * (roomDepth + 1.2);
          const rz = zOffset;

          // Determine Room Status Color (Sahara Color Palette)
          let roomColor = 0x4A7C59; // Available / Vacant -> Warm Forest Green
          let statusText = 'Vacant';
          const cap = room.capacity || 1;
          const alloc = room.allocatedCount || 0;
          const st = String(room.status || '').toLowerCase();

          if (st === 'full' || alloc >= cap) {
            roomColor = 0x8C3C3C; // Fully Occupied -> Rust Crimson (#8C3C3C)
            statusText = 'Full';
          } else if (st === 'partial' || alloc > 0) {
            roomColor = 0xC2652A; // Partially Allocated -> Sahara Terracotta (#C2652A)
            statusText = 'Partial';
          }

          // 3D Room Cube Geometry
          const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
          const roomMat = new THREE.MeshStandardMaterial({
            color: roomColor,
            roughness: 0.4,
            metalness: 0.1,
            transparent: true,
            opacity: 0.92
          });

          const roomMesh = new THREE.Mesh(roomGeo, roomMat);
          roomMesh.position.set(rx, ry, rz);
          roomMesh.castShadow = true;
          roomMesh.receiveShadow = true;

          // Attach room metadata for raycaster interactive tooltips
          roomMesh.userData = {
            room: room,
            statusText: statusText,
            originalColor: roomColor
          };

          scene.add(roomMesh);
          roomObjects.push(roomMesh);

          // Add 3D Door Outline Box
          const doorGeo = new THREE.BoxGeometry(1.1, 1.9, 0.1);
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x605850 });
          const door = new THREE.Mesh(doorGeo, doorMat);
          door.position.set(rx, ry - 0.3, rz + roomDepth / 2 + 0.05);
          scene.add(door);
        });
      });
    });

    // Auto-fit Camera Orbit Controls to encompass all generated blocks cleanly
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    roomObjects.forEach(obj => {
      minX = Math.min(minX, obj.position.x);
      maxX = Math.max(maxX, obj.position.x);
      maxY = Math.max(maxY, obj.position.y);
    });

    if (isFinite(minX) && isFinite(maxX) && controls) {
      const centerX = (minX + maxX) / 2;
      const centerY = Math.max(3, maxY / 2);
      const spanX = maxX - minX;

      controls.target.set(centerX, centerY, 0);
      const camDist = Math.max(32, spanX * 0.9);
      camera.position.set(centerX + camDist * 0.5, centerY + camDist * 0.5, camDist * 0.85);
      controls.update();
    }
  }

  function createBlockHeaderSign(titleText, x, y) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#C2652A';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px EB Garamond, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, 0);
    sprite.scale.set(6, 1.5, 1);
    scene.add(sprite);
  }

  function on3DMouseMove(event) {
    const container = document.getElementById('hostel-3d-canvas-container');
    if (!container || !camera || !raycaster) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomObjects);

    const tooltipEl = document.getElementById('3d-room-tooltip');

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hoveredObject !== hit) {
        if (hoveredObject) {
          hoveredObject.material.emissive.setHex(0x000000);
        }
        hoveredObject = hit;
        hoveredObject.material.emissive.setHex(0x331a0b);
      }

      // Show 3D Floating Tooltip
      if (tooltipEl && hit.userData && hit.userData.room) {
        const room = hit.userData.room;
        const status = hit.userData.statusText;
        const alloc = room.allocatedCount || 0;
        const cap = room.capacity || 1;

        tooltipEl.innerHTML = `
          <div style="font-family:'EB Garamond', serif; font-size:1.1rem; font-weight:700; color:#C2652A; display:flex; justify-content:space-between; align-items:center;">
            <span>Room ${room.number || room.id}</span>
            <span style="font-size:0.75rem; font-family:'Manrope', sans-serif; padding:0.15rem 0.5rem; border-radius:4px; background:${status === 'Full' ? '#8C3C3C' : status === 'Partial' ? '#C2652A' : '#4A7C59'}; color:#fff;">${status}</span>
          </div>
          <div style="margin-top:0.4rem; font-size:0.8rem; color:#605850; display:flex; flex-direction:column; gap:0.2rem;">
            <div><strong>Block:</strong> ${room.block || 'Main'} | <strong>Floor:</strong> ${room.floor || '1st'}</div>
            <div><strong>Category:</strong> ${room.type || 'Standard'}</div>
            <div><strong>Occupancy:</strong> ${alloc} / ${cap} Beds</div>
            <div><strong>Monthly Rent:</strong> ₹${room.rent || 5000}</div>
          </div>
          <div style="margin-top:0.5rem; font-size:0.72rem; color:#78706A; border-top:1px dashed #D9CEBF; padding-top:0.3rem;">
            🖱️ Click room to open detailed audit modal
          </div>
        `;
        tooltipEl.style.display = 'block';

        let tooltipLeft = event.clientX - rect.left + 15;
        let tooltipTop = event.clientY - rect.top + 15;
        if (tooltipLeft + 250 > rect.width) tooltipLeft = event.clientX - rect.left - 255;
        if (tooltipTop + 160 > rect.height) tooltipTop = event.clientY - rect.top - 165;

        tooltipEl.style.left = `${Math.max(10, tooltipLeft)}px`;
        tooltipEl.style.top = `${Math.max(10, tooltipTop)}px`;
      }
    } else {
      if (hoveredObject) {
        hoveredObject.material.emissive.setHex(0x000000);
        hoveredObject = null;
      }
      if (tooltipEl) tooltipEl.style.display = 'none';
    }
  }

  function on3DMouseClick() {
    if (hoveredObject && hoveredObject.userData && hoveredObject.userData.room) {
      const room = hoveredObject.userData.room;
      if (window.showRoomDetailsModal && typeof window.showRoomDetailsModal === 'function') {
        window.showRoomDetailsModal(room.id || room.number);
      }
    }
  }

  function on3DWindowResize() {
    const container = document.getElementById('hostel-3d-canvas-container');
    if (!container || !renderer || !camera) return;

    const width = container.clientWidth || 800;
    const height = 480;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);

    // Skip WebGL GPU rendering if browser tab is hidden or user is not on the Rooms tab
    if (document.hidden) return;
    if (window.state && window.state.currentView !== 'rooms') return;

    const container = document.getElementById('hostel-3d-canvas-container');
    if (!container || container.offsetParent === null) return;

    if (controls) {
      if (isAutoRotating) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;
      } else {
        controls.autoRotate = false;
      }
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // Exposed Helper API for 3D Controls Bar
  window.reset3DCameraView = function () {
    if (camera && controls) {
      camera.position.set(28, 22, 38);
      controls.target.set(0, 4, 0);
      controls.update();
    }
  };

  window.toggle3DAutoRotation = function () {
    isAutoRotating = !isAutoRotating;
    const btn = document.getElementById('btn-3d-autorotate');
    if (btn) {
      btn.innerHTML = isAutoRotating ? '⏸️ Stop 360° Rotate' : '🔄 Auto Rotate 360°';
    }
  };

  window.init3DHostelVisualizer = init3DHostelVisualizer;

})(window, document);
