import * as THREE from "three";

/* ============================================================
   ROOM_01
   MICRO METAVERSE ENGINE
   ============================================================ */

const canvas =
    document.getElementById("world");

const renderer =
    new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance"
    });

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.75)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.15;


/* ============================================================
   SCENE
   ============================================================ */

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(0x050807);

scene.fog =
    new THREE.FogExp2(
        0x07100c,
        0.008
    );


/* ============================================================
   CAMERA
   ============================================================ */

const camera =
    new THREE.PerspectiveCamera(
        68,
        window.innerWidth /
        window.innerHeight,
        0.05,
        1000
    );

camera.position.set(
    0,
    3,
    8
);


/* ============================================================
   LIGHTING
   ============================================================ */

const hemi =
    new THREE.HemisphereLight(
        0x9eb6ad,
        0x101512,
        1.8
    );

scene.add(hemi);

const sun =
    new THREE.DirectionalLight(
        0xd5e6dd,
        2.4
    );

sun.position.set(
    80,
    130,
    40
);

sun.castShadow = true;

sun.shadow.mapSize.set(
    2048,
    2048
);

sun.shadow.camera.left = -160;
sun.shadow.camera.right = 160;
sun.shadow.camera.top = 160;
sun.shadow.camera.bottom = -160;

scene.add(sun);


/* ============================================================
   PLAYER LIGHT
   ============================================================ */

const playerLight =
    new THREE.PointLight(
        0xb8ffda,
        8,
        28,
        2
    );

playerLight.position.set(
    0,
    3,
    0
);

scene.add(playerLight);


/* ============================================================
   WORLD ROOT
   ============================================================ */

const worldRoot =
    new THREE.Group();

scene.add(worldRoot);


/* ============================================================
   PERSISTENCE
   ============================================================ */

const STORAGE =
    "room01_metaverse_state";

let persistent;

try {

    persistent =
        JSON.parse(
            localStorage.getItem(
                STORAGE
            )
        ) || null;

} catch {

    persistent = null;
}

if (!persistent) {

    persistent = {

        discovered: [],

        worldsVisited: [],

        objectsUsed: [],

        seed:
            Math.floor(
                Math.random() *
                99999999
            )
    };
}

function saveState() {

    localStorage.setItem(
        STORAGE,
        JSON.stringify(
            persistent
        )
    );
}


/* ============================================================
   WORLD DEFINITIONS
   ============================================================ */

const WORLD_DEFINITIONS = {

    HOME: {

        code: "W-01",

        title: "HOME",

        location: "CENTRAL",

        fog: 0.006,

        sky: 0x07100d,

        ground: 0x171e1a,

        accent: 0x9effc9
    },

    VERDANT: {

        code: "W-02",

        title: "VERDANT",

        location: "NORTH FOREST",

        fog: 0.018,

        sky: 0x08100c,

        ground: 0x111b13,

        accent: 0x9bd6a8
    },

    NULL: {

        code: "W-03",

        title: "NULL",

        location: "UNDEFINED",

        fog: 0.012,

        sky: 0x07080b,

        ground: 0x111116,

        accent: 0xb3b7ff
    }
};

let currentWorld =
    "HOME";


/* ============================================================
   MATERIAL FACTORY
   ============================================================ */

function mat(
    color,
    roughness = 0.8,
    metalness = 0
) {

    return new THREE.MeshStandardMaterial({

        color,

        roughness,

        metalness
    });
}


/* ============================================================
   WORLD CLEAR
   ============================================================ */

function clearWorld() {

    while (
        worldRoot.children.length
    ) {

        const object =
            worldRoot.children.pop();

        object.traverse(child => {

            if (child.geometry) {

                child.geometry.dispose();
            }

            if (child.material) {

                if (
                    Array.isArray(
                        child.material
                    )
                ) {

                    child.material
                        .forEach(
                            m => m.dispose()
                        );

                } else {

                    child.material.dispose();
                }
            }
        });
    }
}


/* ============================================================
   PROCEDURAL RANDOM
   ============================================================ */

function random(seed) {

    const x =
        Math.sin(
            seed * 12.9898 +
            persistent.seed * 0.00013
        ) *
        43758.5453123;

    return x -
        Math.floor(x);
}


/* ============================================================
   TERRAIN
   ============================================================ */

function terrainHeight(x, z) {

    if (
        currentWorld ===
        "NULL"
    ) {

        return (
            Math.sin(x * 0.035) * 2 +
            Math.cos(z * 0.025) * 1.4
        );
    }

    const a =
        Math.sin(
            x * 0.018 +
            z * 0.011
        );

    const b =
        Math.sin(
            z * 0.037
        );

    const c =
        Math.cos(
            x * 0.052
        );

    return (
        a * 1.6 +
        b * 0.7 +
        c * 0.35
    );
}


/* ============================================================
   TERRAIN MESH
   ============================================================ */

function createTerrain() {

    const size = 360;

    const segments = 100;

    const geometry =
        new THREE.PlaneGeometry(
            size,
            size,
            segments,
            segments
        );

    const position =
        geometry.attributes.position;

    for (
        let i = 0;
        i < position.count;
        i++
    ) {

        const x =
            position.getX(i);

        const z =
            -position.getY(i);

        position.setZ(
            i,
            terrainHeight(x, z)
        );
    }

    geometry.computeVertexNormals();

    const material =
        mat(
            WORLD_DEFINITIONS[
                currentWorld
            ].ground,
            1
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.rotation.x =
        -Math.PI / 2;

    mesh.receiveShadow = true;

    worldRoot.add(mesh);
}


/* ============================================================
   GRASS
   ============================================================ */

function createGrass() {

    if (
        currentWorld ===
        "NULL"
    ) return;

    const count =
        currentWorld ===
        "VERDANT"
            ? 7000
            : 3000;

    const geometry =
        new THREE.BufferGeometry();

    const positions =
        new Float32Array(
            count * 3
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const x =
            (random(i * 1.31) - .5) *
            330;

        const z =
            (random(i * 2.71) - .5) *
            330;

        positions[i * 3] =
            x;

        positions[i * 3 + 1] =
            terrainHeight(x, z);

        positions[i * 3 + 2] =
            z;
    }

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            positions,
            3
        )
    );

    const material =
        new THREE.PointsMaterial({

            color:
                currentWorld ===
                "VERDANT"
                    ? 0x759a79
                    : 0x66736b,

            size:
                currentWorld ===
                "VERDANT"
                    ? 0.14
                    : 0.1,

            transparent: true,

            opacity: .75
        });

    const grass =
        new THREE.Points(
            geometry,
            material
        );

    worldRoot.add(grass);
}


/* ============================================================
   TREES
   ============================================================ */

function createTree(
    x,
    z,
    scale = 1
) {

    const group =
        new THREE.Group();

    const y =
        terrainHeight(x, z);

    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                .25 * scale,
                .42 * scale,
                5 * scale,
                7
            ),
            mat(0x30251d)
        );

    trunk.position.y =
        y + 2.5 * scale;

    trunk.castShadow = true;

    group.add(trunk);

    const crownMaterial =
        mat(
            currentWorld ===
            "VERDANT"
                ? 0x263d2b
                : 0x29352f
        );

    const crown =
        new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                2.3 * scale,
                1
            ),
            crownMaterial
        );

    crown.position.y =
        y + 5.1 * scale;

    crown.castShadow = true;

    group.add(crown);

    group.position.x = x;
    group.position.z = z;

    worldRoot.add(group);

    return group;
}

function createForest() {

    const count =
        currentWorld ===
        "VERDANT"
            ? 500
            : 180;

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const angle =
            random(i * 7.1) *
            Math.PI *
            2;

        const radius =
            25 +
            random(i * 9.7) *
            145;

        const x =
            Math.cos(angle) *
            radius;

        const z =
            Math.sin(angle) *
            radius;

        /*
           Keep central area open.
        */
        if (
            Math.hypot(x, z) <
            18
        ) {
            continue;
        }

        createTree(
            x,
            z,
            .65 +
            random(i * 12.4) *
            1.25
        );
    }
}


/* ============================================================
   BUILDING
   ============================================================ */

function createBuilding(
    x,
    z,
    w,
    h,
    d,
    color
) {

    const group =
        new THREE.Group();

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                w,
                h,
                d
            ),
            mat(
                color,
                .7,
                .1
            )
        );

    body.position.y =
        terrainHeight(x, z) +
        h / 2;

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);

    /*
       Roof
    */

    const roof =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                Math.max(w,d) *
                .72,
                h * .45,
                4
            ),
            mat(
                0x121714,
                .9
            )
        );

    roof.position.y =
        terrainHeight(x, z) +
        h +
        h * .2;

    roof.rotation.y =
        Math.PI / 4;

    roof.castShadow = true;

    group.add(roof);

    group.position.x = x;
    group.position.z = z;

    worldRoot.add(group);

    return group;
}


/* ============================================================
   HOME
   ============================================================ */

function buildHome() {

    /*
       Central plaza.
    */

    const plaza =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                16,
                16,
                .35,
                64
            ),
            mat(
                0x242b27,
                .85
            )
        );

    plaza.position.y =
        terrainHeight(0, 0) +
        .15;

    plaza.receiveShadow = true;

    worldRoot.add(plaza);

    /*
       Four buildings.
    */

    createBuilding(
        -22,
        -18,
        9,
        7,
        9,
        0x28312c
    );

    createBuilding(
        22,
        -18,
        8,
        10,
        8,
        0x222b27
    );

    createBuilding(
        -22,
        18,
        11,
        6,
        8,
        0x303934
    );

    createBuilding(
        23,
        19,
        7,
        12,
        7,
        0x202824
    );

    /*
       Central monolith.
    */

    createMonolith(
        0,
        0,
        3.5
    );

    /*
       World portals.
    */

    createPortal(
        -9,
        0,
        "VERDANT",
        0xff7b4d
    );

    createPortal(
        9,
        0,
        "NULL",
        0x8b82ff
    );
}


/* ============================================================
   MONOLITH
   ============================================================ */

function createMonolith(
    x,
    z,
    scale = 1
) {

    const group =
        new THREE.Group();

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                scale,
                scale * 5,
                scale
            ),
            mat(
                0x171d1a,
                .25,
                .8
            )
        );

    body.position.y =
        terrainHeight(x, z) +
        scale * 2.5;

    body.castShadow = true;

    group.add(body);

    /*
       Thin emissive core.
    */

    const core =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                scale * .15,
                scale * 4.2,
                scale * .15
            ),
            new THREE.MeshBasicMaterial({
                color:
                    WORLD_DEFINITIONS[
                        currentWorld
                    ].accent
            })
        );

    core.position.y =
        terrainHeight(x, z) +
        scale * 2.5;

    group.add(core);

    group.position.x = x;
    group.position.z = z;

    worldRoot.add(group);

    return group;
}


/* ============================================================
   PORTAL
   ============================================================ */

const portalObjects = [];

function createPortal(
    x,
    z,
    destination,
    color
) {

    const group =
        new THREE.Group();

    const frameMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x111613,

            metalness: .85,

            roughness: .22
        });

    const frame =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                4,
                .28,
                12,
                64
            ),
            frameMaterial
        );

    frame.rotation.x =
        Math.PI / 2;

    frame.position.y =
        terrainHeight(x, z) +
        4;

    group.add(frame);

    const ringMaterial =
        new THREE.MeshBasicMaterial({

            color,

            transparent: true,

            opacity: .65
        });

    const ring =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                3.5,
                .08,
                8,
                64
            ),
            ringMaterial
        );

    ring.rotation.x =
        Math.PI / 2;

    ring.position.y =
        terrainHeight(x, z) +
        4;

    group.add(ring);

    const light =
        new THREE.PointLight(
            color,
            4,
            18
        );

    light.position.y =
        terrainHeight(x, z) +
        3;

    group.add(light);

    group.position.x = x;
    group.position.z = z;

    worldRoot.add(group);

    portalObjects.push({

        object: group,

        destination,

        ring
    });
}


/* ============================================================
   VERDANT
   ============================================================ */

function buildVerdant() {

    createForest();

    /*
       Lake.
    */

    const lake =
        new THREE.Mesh(
            new THREE.CircleGeometry(
                28,
                64
            ),
            new THREE.MeshPhysicalMaterial({

                color: 0x162d2b,

                roughness: .08,

                metalness: .1,

                transmission: .15,

                transparent: true,

                opacity: .92
            })
        );

    lake.rotation.x =
        -Math.PI / 2;

    lake.position.set(
        35,
        terrainHeight(35, 0) + .12,
        0
    );

    worldRoot.add(lake);

    /*
       Ruins.
    */

    createRuin(
        -30,
        -45
    );

    createRuin(
        55,
        55
    );

    createRuin(
        -65,
        70
    );

    /*
       Return portal.
    */

    createPortal(
        0,
        0,
        "HOME",
        0x9effc9
    );

    /*
       Hidden second portal.
    */

    createPortal(
        75,
        -70,
        "NULL",
        0x8b82ff
    );
}


/* ============================================================
   RUINS
   ============================================================ */

function createRuin(x, z) {

    const y =
        terrainHeight(x, z);

    const group =
        new THREE.Group();

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const h =
            4 +
            random(
                x * 2 +
                z * 3 +
                i
            ) *
            7;

        const column =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.3,
                    h,
                    1.3
                ),
                mat(
                    0x343a35,
                    .95
                )
            );

        const angle =
            i *
            Math.PI /
            2;

        column.position.set(

            Math.cos(angle) * 5,

            y +
            h / 2,

            Math.sin(angle) * 5
        );

        column.rotation.y =
            random(i * 12.1) * .4;

        column.castShadow = true;

        group.add(column);
    }

    group.position.set(
        x,
        0,
        z
    );

    worldRoot.add(group);
}


/* ============================================================
   NULL
   ============================================================ */

function buildNull() {

    scene.fog =
        new THREE.FogExp2(
            0x05050b,
            .010
        );

    /*
       Floating structures.
    */

    for (
        let i = 0;
        i < 26;
        i++
    ) {

        const angle =
            random(i * 3.14) *
            Math.PI * 2;

        const radius =
            15 +
            random(i * 8.17) *
            85;

        const x =
            Math.cos(angle) *
            radius;

        const z =
            Math.sin(angle) *
            radius;

        const size =
            2 +
            random(i * 9.8) *
            7;

        const cube =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    size,
                    size,
                    size
                ),
                mat(
                    0x171923,
                    .3,
                    .8
                )
            );

        cube.position.set(
            x,
            5 +
            random(i * 4.2) * 24,
            z
        );

        cube.rotation.set(
            random(i) * 2,
            random(i * 2) * 2,
            random(i * 3) * 2
        );

        cube.castShadow = true;

        worldRoot.add(cube);
    }

    /*
       Giant central void object.
    */

    const geometry =
        new THREE.TorusKnotGeometry(
            12,
            1.2,
            180,
            24
        );

    const material =
        new THREE.MeshStandardMaterial({

            color: 0x151a2d,

            metalness: .9,

            roughness: .16,

            emissive: 0x222255,

            emissiveIntensity: .8
        });

    const object =
        new THREE.Mesh(
            geometry,
            material
        );

    object.position.y =
        14;

    object.castShadow = true;

    worldRoot.add(object);

    /*
       Portal back.
    */

    createPortal(
        0,
        0,
        "HOME",
        0x9effc9
    );
}


/* ============================================================
   WORLD BUILD
   ============================================================ */

function buildWorld(
    worldName
) {

    currentWorld =
        worldName;

    clearWorld();

    portalObjects.length = 0;

    const definition =
        WORLD_DEFINITIONS[
            worldName
        ];

    scene.background =
        new THREE.Color(
            definition.sky
        );

    scene.fog =
        new THREE.FogExp2(
            definition.sky,
            definition.fog
        );

    hemi.color.setHex(
        worldName === "NULL"
            ? 0x7777a0
            : 0x9eb6ad
    );

    sun.color.setHex(
        worldName === "NULL"
            ? 0x8c8cb8
            : 0xd5e6dd
    );

    sun.intensity =
        worldName === "NULL"
            ? 1.1
            : 2.4;

    createTerrain();

    createGrass();

    if (
        worldName ===
        "HOME"
    ) {

        buildHome();

    } else if (
        worldName ===
        "VERDANT"
    ) {

        buildVerdant();

    } else {

        buildNull();
    }

    if (
        !persistent.worldsVisited
            .includes(worldName)
    ) {

        persistent.worldsVisited.push(
            worldName
        );

        saveState();
    }

    updateWorldUI();
}


/* ============================================================
   AVATAR
   ============================================================ */

const avatar =
    new THREE.Group();

scene.add(avatar);

function buildAvatar() {

    avatar.clear();

    const bodyMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x202725,

            roughness: .65,

            metalness: .2
        });

    const head =
        new THREE.Mesh(
            new THREE.IcosahedronGeometry(
                .48,
                2
            ),
            bodyMaterial
        );

    head.position.y =
        2.8;

    head.castShadow = true;

    avatar.add(head);

    const body =
        new THREE.Mesh(
            new THREE.CapsuleGeometry(
                .62,
                1.4,
                5,
                8
            ),
            bodyMaterial
        );

    body.position.y =
        1.5;

    body.castShadow = true;

    avatar.add(body);

    const leftArm =
        createLimb(
            -.78,
            1.7
        );

    const rightArm =
        createLimb(
            .78,
            1.7
        );

    avatar.add(
        leftArm,
        rightArm
    );

    const leftLeg =
        createLimb(
            -.3,
            .55
        );

    const rightLeg =
        createLimb(
            .3,
            .55
        );

    leftLeg.scale.y = 1.3;
    rightLeg.scale.y = 1.3;

    avatar.add(
        leftLeg,
        rightLeg
    );
}

function createLimb(
    x,
    y
) {

    const mesh =
        new THREE.Mesh(
            new THREE.CapsuleGeometry(
                .18,
                .85,
                4,
                6
            ),
            mat(
                0x252d29
            )
        );

    mesh.position.set(
        x,
        y,
        0
    );

    mesh.castShadow = true;

    return mesh;
}

buildAvatar();


/* ============================================================
   PLAYER
   ============================================================ */

const player = {

    position:
        new THREE.Vector3(
            0,
            0,
            8
        ),

    velocity:
        new THREE.Vector3(),

    yaw: Math.PI,

    pitch: 0,

    speed: 7,

    thirdPerson: true,

    active: false
};


/* ============================================================
   INPUT
   ============================================================ */

const keys = {};

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code ===
            "Tab"
        ) {

            event.preventDefault();

            toggleWorldMenu();
        }

        if (
            event.code ===
            "KeyC"
        ) {

            player.thirdPerson =
                !player.thirdPerson;
        }

        if (
            event.code ===
            "KeyE"
        ) {

            interact();
        }
    }
);

window.addEventListener(
    "keyup",
    event => {

        keys[event.code] =
            false;
    }
);

let pointerLocked = false;

canvas.addEventListener(
    "click",
    () => {

        if (
            !player.active
        ) return;

        canvas.requestPointerLock();
    }
);

document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement ===
            canvas;
    }
);

document.addEventListener(
    "mousemove",
    event => {

        if (
            !pointerLocked
        ) return;

        player.yaw -=
            event.movementX *
            .0022;

        player.pitch -=
            event.movementY *
            .0018;

        player.pitch =
            THREE.MathUtils.clamp(
                player.pitch,
                -1.2,
                1.2
            );
    }
);


/* ============================================================
   MOVEMENT
   ============================================================ */

function updatePlayer(dt) {

    if (
        !player.active
    ) return;

    let forward = 0;
    let right = 0;

    if (
        keys.KeyW ||
        keys.ArrowUp
    ) forward++;

    if (
        keys.KeyS ||
        keys.ArrowDown
    ) forward--;

    if (
        keys.KeyD ||
        keys.ArrowRight
    ) right++;

    if (
        keys.KeyA ||
        keys.ArrowLeft
    ) right--;

    const direction =
        new THREE.Vector3();

    if (
        forward ||
        right
    ) {

        const length =
            Math.hypot(
                forward,
                right
            );

        forward /= length;
        right /= length;

        direction.set(
            Math.sin(
                player.yaw
            ) * forward +
            Math.cos(
                player.yaw
            ) * right,

            0,

            Math.cos(
                player.yaw
            ) * forward -
            Math.sin(
                player.yaw
            ) * right
        );

        player.position.addScaledVector(
            direction,
            player.speed * dt
        );

        avatar.rotation.y =
            player.yaw;
    }

    player.position.y =
        terrainHeight(
            player.position.x,
            player.position.z
        );

    avatar.position.copy(
        player.position
    );

    avatar.position.y += .02;
}


/* ============================================================
   CAMERA
   ============================================================ */

function updateCamera(dt) {

    const target =
        new THREE.Vector3();

    if (
        player.thirdPerson
    ) {

        /*
           Third-person Worlds-style view.
        */

        const distance = 7;

        target.set(
            player.position.x -
                Math.sin(
                    player.yaw
                ) *
                distance,

            player.position.y +
                3.5,

            player.position.z -
                Math.cos(
                    player.yaw
                ) *
                distance
        );

        camera.position.lerp(
            target,
            1 -
            Math.pow(
                .001,
                dt
            )
        );

        const look =
            new THREE.Vector3(
                player.position.x,
                player.position.y + 1.7,
                player.position.z
            );

        camera.lookAt(
            look
        );

        avatar.visible = true;

    } else {

        /*
           First person.
        */

        camera.position.set(
            player.position.x,
            player.position.y + 2.7,
            player.position.z
        );

        const direction =
            new THREE.Vector3(
                -Math.sin(
                    player.yaw
                ) *
                Math.cos(
                    player.pitch
                ),

                Math.sin(
                    player.pitch
                ),

                -Math.cos(
                    player.yaw
                ) *
                Math.cos(
                    player.pitch
                )
            );

        camera.lookAt(
            camera.position.clone()
                .add(direction)
        );

        avatar.visible = false;
    }

    playerLight.position.copy(
        camera.position
    );
}


/* ============================================================
   INTERACTION
   ============================================================ */

let nearbyPortal = null;

function interact() {

    if (
        !nearbyPortal
    ) return;

    loadWorld(
        nearbyPortal.destination
    );
}

function updateInteraction() {

    nearbyPortal = null;

    let closest =
        Infinity;

    for (
        const portal
        of portalObjects
    ) {

        const distance =
            portal.object.position
                .distanceTo(
                    player.position
                );

        if (
            distance < 8 &&
            distance < closest
        ) {

            closest =
                distance;

            nearbyPortal =
                portal;
        }
    }

    const interaction =
        document.getElementById(
            "interaction"
        );

    if (
        nearbyPortal
    ) {

        document.getElementById(
            "interactionText"
        ).textContent =
            "ENTER " +
            nearbyPortal.destination;

        interaction.classList.add(
            "visible"
        );

    } else {

        interaction.classList.remove(
            "visible"
        );
    }
}


/* ============================================================
   WORLD MENU
   ============================================================ */

const worldMenu =
    document.getElementById(
        "worldMenu"
    );

function toggleWorldMenu() {

    worldMenu.classList.toggle(
        "visible"
    );
}

document.querySelectorAll(
    ".world-card"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            loadWorld(
                button.dataset.world
            );

            worldMenu.classList.remove(
                "visible"
            );
        }
    );
});


/* ============================================================
   LOAD WORLD
   ============================================================ */

function loadWorld(
    worldName
) {

    buildWorld(
        worldName
    );

    player.position.set(
        0,
        0,
        10
    );

    player.yaw =
        Math.PI;

    showNotification(
        "ENTERED " +
        worldName
    );
}


/* ============================================================
   UI
   ============================================================ */

function updateWorldUI() {

    const definition =
        WORLD_DEFINITIONS[
            currentWorld
        ];

    document.getElementById(
        "worldName"
    ).textContent =
        definition.title;

    document.getElementById(
        "worldCode"
    ).textContent =
        definition.code;

    document.getElementById(
        "locationName"
    ).textContent =
        definition.location;

    document.querySelectorAll(
        ".world-card"
    ).forEach(card => {

        card.classList.toggle(
            "active",
            card.dataset.world ===
            currentWorld
        );
    });
}

let notificationTimer;

function showNotification(
    message
) {

    const element =
        document.getElementById(
            "notification"
        );

    element.textContent =
        message;

    element.classList.add(
        "visible"
    );

    clearTimeout(
        notificationTimer
    );

    notificationTimer =
        setTimeout(
            () => {

                element.classList.remove(
                    "visible"
                );

            },
            2500
        );
    );
}


/* ============================================================
   CLOCK
   ============================================================ */

let worldTime = 18;

function updateClock(dt) {

    worldTime +=
        dt * .35;

    if (
        worldTime >= 24
    ) {

        worldTime -= 24;
    }

    const hours =
        Math.floor(
            worldTime
        );

    const minutes =
        Math.floor(
            (worldTime - hours) *
            60
        );

    document.getElementById(
        "clock"
    ).textContent =
        String(hours)
            .padStart(2, "0") +
        ":" +
        String(minutes)
            .padStart(2, "0");

    /*
       Day/night light.
    */

    const daylight =
        Math.max(
            0,
            Math.sin(
                (
                    worldTime -
                    6
                ) /
                24 *
                Math.PI *
                2
            )
        );

    sun.intensity =
        .4 +
        daylight * 2.2;

    hemi.intensity =
        .5 +
        daylight * 1.4;
}


/* ============================================================
   PORTAL ANIMATION
   ============================================================ */

function updatePortals(
    time
) {

    for (
        const portal
        of portalObjects
    ) {

        portal.ring.rotation.z =
            time * .0004;

        portal.ring.scale.setScalar(
            1 +
            Math.sin(
                time * .003
            ) * .06
        );
    }
}


/* ============================================================
   AMBIENT PARTICLES
   ============================================================ */

let particles;

function createParticles() {

    const geometry =
        new THREE.BufferGeometry();

    const count = 1800;

    const positions =
        new Float32Array(
            count * 3
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {

        positions[i * 3] =
            (
                Math.random() -
                .5
            ) * 280;

        positions[i * 3 + 1] =
            Math.random() * 60;

        positions[i * 3 + 2] =
            (
                Math.random() -
                .5
            ) * 280;
    }

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            positions,
            3
        )
    );

    particles =
        new THREE.Points(
            geometry,
            new THREE.PointsMaterial({

                color: 0x9eb4a8,

                size: .055,

                transparent: true,

                opacity: .38
            })
        );

    scene.add(
        particles
    );
}

createParticles();


/* ============================================================
   START SCREEN
   ============================================================ */

document.getElementById(
    "enter"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "start"
        ).classList.add(
            "hidden"
        );

        document.getElementById(
            "boot"
        ).classList.add(
            "hidden"
        );

        document.getElementById(
            "hud"
        ).classList.add(
            "visible"
        );

        document.getElementById(
            "crosshair"
        ).classList.add(
            "visible"
        );

        document.getElementById(
            "controls"
        ).classList.add(
            "visible"
        );

        player.active = true;

        canvas.requestPointerLock();
    }
);


/* ============================================================
   RESIZE
   ============================================================ */

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                1.75
            )
        );
    }
);


/* ============================================================
   ANIMATION
   ============================================================ */

const clock =
    new THREE.Clock();

let previousTime = 0;

function animate(time) {

    requestAnimationFrame(
        animate
    );

    const dt =
        Math.min(
            clock.getDelta(),
            .05
        );

    updatePlayer(dt);

    updateCamera(dt);

    updateInteraction();

    updateClock(dt);

    updatePortals(time);

    if (particles) {

        particles.rotation.y =
            time * .00001;
    }

    renderer.render(
        scene,
        camera
    );
}


/* ============================================================
   INITIAL WORLD
   ============================================================ */

buildWorld(
    "HOME"
);

animate(0);
