const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    depth: true
});

if (!gl) {
    document.body.innerHTML = "<pre>WebGL unavailable.</pre>";
    throw new Error("WebGL unavailable");
}

/* ============================================================
   ROOM_01
   FOREST / FOG / REACTIVE WORLD
   ============================================================ */

const TAU = Math.PI * 2;

let width = 1;
let height = 1;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", resize);
resize();

/* ============================================================
   SHADERS
   ============================================================ */

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUV;

void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);

    vWorldPosition = world.xyz;
    vNormal = mat3(uModel) * aNormal;
    vUV = aUV;

    gl_Position = uProjection * uView * world;
}
`;

const fragmentShaderSource = `
precision highp float;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUV;

uniform vec3 uCameraPosition;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;

uniform float uFogNear;
uniform float uFogFar;

uniform float uTime;
uniform float uWorldDisturbance;

float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0,0,0));
    float n100 = hash(i + vec3(1,0,0));
    float n010 = hash(i + vec3(0,1,0));
    float n110 = hash(i + vec3(1,1,0));
    float n001 = hash(i + vec3(0,0,1));
    float n101 = hash(i + vec3(1,0,1));
    float n011 = hash(i + vec3(0,1,1));
    float n111 = hash(i + vec3(1,1,1));

    return mix(
        mix(
            mix(n000, n100, f.x),
            mix(n010, n110, f.x),
            f.y
        ),
        mix(
            mix(n001, n101, f.x),
            mix(n011, n111, f.x),
            f.y
        ),
        f.z
    );
}

void main() {

    vec3 normal = normalize(vNormal);

    vec3 toLight = uLightPosition - vWorldPosition;
    float lightDistance = length(toLight);

    vec3 lightDir = normalize(toLight);

    float diffuse = max(dot(normal, lightDir), 0.0);

    float attenuation =
        1.0 /
        (1.0 +
        lightDistance * 0.055 +
        lightDistance * lightDistance * 0.004);

    float flashlight = diffuse * attenuation;

    vec3 base;

    float groundNoise =
        noise(vWorldPosition * 0.18) * 0.65 +
        noise(vWorldPosition * 0.7) * 0.35;

    if (normal.y > 0.45) {
        base = mix(
            vec3(0.045, 0.060, 0.047),
            vec3(0.095, 0.115, 0.085),
            groundNoise
        );
    } else {
        base = mix(
            vec3(0.035, 0.027, 0.022),
            vec3(0.075, 0.050, 0.032),
            groundNoise
        );
    }

    float trunkVariation = noise(vWorldPosition * 0.35);

    if (normal.y < 0.55) {
        base *= mix(0.55, 1.15, trunkVariation);
    }

    vec3 ambient = vec3(0.055, 0.075, 0.068);

    /*
       Very slight world-state-dependent lighting distortion.
       It is intentionally subtle.
    */
    float disturbanceLight =
        sin(uTime * 0.21 + vWorldPosition.x * 0.08) *
        0.008 *
        uWorldDisturbance;

    vec3 color =
        base * ambient +
        base * uLightColor * flashlight * 2.0;

    color += disturbanceLight;

    /*
       Fog.
       Distance is deliberately quite short.
    */
    float distanceFromCamera =
        length(vWorldPosition - uCameraPosition);

    float fog =
        smoothstep(
            uFogNear,
            uFogFar,
            distanceFromCamera
        );

    /*
       Slightly non-uniform fog.
       It prevents the scene from looking like a simple
       linear atmospheric effect.
    */
    float fogNoise =
        noise(
            vWorldPosition * 0.025 +
            vec3(0.0, uTime * 0.006, 0.0)
        );

    fog += (fogNoise - 0.5) * 0.11;
    fog = clamp(fog, 0.0, 1.0);

    vec3 fogColor =
        vec3(0.018, 0.027, 0.025);

    color = mix(color, fogColor, fog);

    /*
       Extremely subtle distance darkening.
    */
    float darkness =
        smoothstep(15.0, 55.0, distanceFromCamera);

    color *= mix(1.0, 0.72, darkness);

    gl_FragColor = vec4(color, 1.0);
}
`;

/* ============================================================
   SHADER COMPILATION
   ============================================================ */

function compileShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        throw new Error("Shader compilation failed");
    }

    return shader;
}

const vertexShader =
    compileShader(gl.VERTEX_SHADER, vertexShaderSource);

const fragmentShader =
    compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

gl.useProgram(program);

/* ============================================================
   ATTRIBUTES / UNIFORMS
   ============================================================ */

const aPosition =
    gl.getAttribLocation(program, "aPosition");

const aNormal =
    gl.getAttribLocation(program, "aNormal");

const aUV =
    gl.getAttribLocation(program, "aUV");

const uProjection =
    gl.getUniformLocation(program, "uProjection");

const uView =
    gl.getUniformLocation(program, "uView");

const uModel =
    gl.getUniformLocation(program, "uModel");

const uCameraPosition =
    gl.getUniformLocation(program, "uCameraPosition");

const uLightPosition =
    gl.getUniformLocation(program, "uLightPosition");

const uLightColor =
    gl.getUniformLocation(program, "uLightColor");

const uFogNear =
    gl.getUniformLocation(program, "uFogNear");

const uFogFar =
    gl.getUniformLocation(program, "uFogFar");

const uTime =
    gl.getUniformLocation(program, "uTime");

const uWorldDisturbance =
    gl.getUniformLocation(program, "uWorldDisturbance");

/* ============================================================
   MATRIX FUNCTIONS
   ============================================================ */

function identity() {
    return [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ];
}

function multiply(a, b) {
    const out = new Array(16);

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            out[col * 4 + row] =
                a[0 * 4 + row] * b[col * 4 + 0] +
                a[1 * 4 + row] * b[col * 4 + 1] +
                a[2 * 4 + row] * b[col * 4 + 2] +
                a[3 * 4 + row] * b[col * 4 + 3];
        }
    }

    return out;
}

function translation(x, y, z) {
    return [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        x,y,z,1
    ];
}

function scale(x, y, z) {
    return [
        x,0,0,0,
        0,y,0,0,
        0,0,z,0,
        0,0,0,1
    ];
}

function rotationY(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);

    return [
         c,0,-s,0,
         0,1, 0,0,
         s,0, c,0,
         0,0, 0,1
    ];
}

function rotationX(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);

    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0,-s, c, 0,
        0, 0, 0, 1
    ];
}

function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    return [
        f / aspect,0,0,0,
        0,f,0,0,
        0,0,(far + near) * nf,-1,
        0,0,(2 * far * near) * nf,0
    ];
}

function lookAt(position, target, up) {

    let zx = position[0] - target[0];
    let zy = position[1] - target[1];
    let zz = position[2] - target[2];

    let len = Math.hypot(zx, zy, zz);

    zx /= len;
    zy /= len;
    zz /= len;

    let xx =
        up[1] * zz -
        up[2] * zy;

    let xy =
        up[2] * zx -
        up[0] * zz;

    let xz =
        up[0] * zy -
        up[1] * zx;

    len = Math.hypot(xx, xy, xz);

    xx /= len;
    xy /= len;
    xz /= len;

    const yx =
        zy * xz -
        zz * xy;

    const yy =
        zz * xx -
        zx * xz;

    const yz =
        zx * xy -
        zy * xx;

    return [
        xx,yx,zx,0,
        xy,yy,zy,0,
        xz,yz,zz,0,

        -(xx * position[0] +
          xy * position[1] +
          xz * position[2]),

        -(yx * position[0] +
          yy * position[1] +
          yz * position[2]),

        -(zx * position[0] +
          zy * position[1] +
          zz * position[2]),

        1
    ];
}

/* ============================================================
   GEOMETRY
   ============================================================ */

function createMesh(vertices, indices) {

    const vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW
    );

    const indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    );

    return {
        vertexBuffer,
        indexBuffer,
        count: indices.length
    };
}

/*
    Vertex:
    position xyz
    normal xyz
    uv xy
*/

function createCube() {

    const v = [
        // front
        -0.5,-0.5, 0.5,  0,0,1,  0,0,
         0.5,-0.5, 0.5,  0,0,1,  1,0,
         0.5, 0.5, 0.5,  0,0,1,  1,1,
        -0.5, 0.5, 0.5,  0,0,1,  0,1,

        // back
         0.5,-0.5,-0.5,  0,0,-1,  0,0,
        -0.5,-0.5,-0.5,  0,0,-1,  1,0,
        -0.5, 0.5,-0.5,  0,0,-1,  1,1,
         0.5, 0.5,-0.5,  0,0,-1,  0,1,

        // left
        -0.5,-0.5,-0.5, -1,0,0, 0,0,
        -0.5,-0.5, 0.5, -1,0,0, 1,0,
        -0.5, 0.5, 0.5, -1,0,0, 1,1,
        -0.5, 0.5,-0.5, -1,0,0, 0,1,

        // right
         0.5,-0.5, 0.5, 1,0,0, 0,0,
         0.5,-0.5,-0.5, 1,0,0, 1,0,
         0.5, 0.5,-0.5, 1,0,0, 1,1,
         0.5, 0.5, 0.5, 1,0,0, 0,1,

        // top
        -0.5,0.5, 0.5, 0,1,0, 0,0,
         0.5,0.5, 0.5, 0,1,0, 1,0,
         0.5,0.5,-0.5, 0,1,0, 1,1,
        -0.5,0.5,-0.5, 0,1,0, 0,1,

        // bottom
        -0.5,-0.5,-0.5, 0,-1,0, 0,0,
         0.5,-0.5,-0.5, 0,-1,0, 1,0,
         0.5,-0.5, 0.5, 0,-1,0, 1,1,
        -0.5,-0.5, 0.5, 0,-1,0, 0,1
    ];

    const i = [];

    for (let f = 0; f < 6; f++) {
        const n = f * 4;

        i.push(
            n, n + 1, n + 2,
            n, n + 2, n + 3
        );
    }

    return createMesh(v, i);
}

const cubeMesh = createCube();

/* ============================================================
   RANDOM / NOISE
   ============================================================ */

function hash2(x, z) {

    const s =
        Math.sin(
            x * 127.1 +
            z * 311.7 +
            17.31
        ) * 43758.5453123;

    return s - Math.floor(s);
}

function smoothNoise(x, z) {

    const ix = Math.floor(x);
    const iz = Math.floor(z);

    const fx = x - ix;
    const fz = z - iz;

    const sx =
        fx * fx * (3 - 2 * fx);

    const sz =
        fz * fz * (3 - 2 * fz);

    const a = hash2(ix, iz);
    const b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1);
    const d = hash2(ix + 1, iz + 1);

    return (
        a * (1 - sx) * (1 - sz) +
        b * sx * (1 - sz) +
        c * (1 - sx) * sz +
        d * sx * sz
    );
}

function terrainHeight(x, z) {

    const large =
        smoothNoise(x * 0.018, z * 0.018);

    const medium =
        smoothNoise(x * 0.055, z * 0.055);

    const small =
        smoothNoise(x * 0.16, z * 0.16);

    let h =
        (large - 0.5) * 3.0 +
        (medium - 0.5) * 0.9 +
        (small - 0.5) * 0.22;

    /*
       Keep the central walking route comparatively
       navigable while leaving the forest uneven.
    */
    const distanceFromPath =
        Math.abs(x - pathX(z));

    if (distanceFromPath < 3.0) {
        h *= distanceFromPath / 3.0;
    }

    return h;
}

function pathX(z) {

    return (
        Math.sin(z * 0.018) * 5.5 +
        Math.sin(z * 0.047) * 1.8
    );
}

/* ============================================================
   WORLD STATE
   ============================================================ */

const STORAGE_KEY = "room01_forest_state_v1";

let savedState;

try {
    savedState =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "null"
        );
} catch {
    savedState = null;
}

if (!savedState) {
    savedState = {
        executionCount: 0,
        anomaliesSeen: [],
        landmarks: {},
        seed: Math.floor(Math.random() * 99999999)
    };
}

savedState.executionCount++;

localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(savedState)
);

/*
   The forest has a persistent identity.
*/
const WORLD_SEED = savedState.seed;

/* ============================================================
   PLAYER
   ============================================================ */

const player = {

    position: [
        pathX(0),
        terrainHeight(pathX(0), 0) + 1.7,
        0
    ],

    yaw: Math.PI,

    pitch: 0,

    speed: 4.1,

    walking: false,

    distance: 0,

    previousZ: 0,

    previousX: 0,

    stoppedFor: 0,

    lookBacks: 0,

    lastYaw: Math.PI,

    headingChanges: 0,

    offPathTime: 0,

    revisits: 0,

    landmarksSeen: new Set(),

    lastLandmark: null,

    time: 0
};

/* ============================================================
   INPUT
   ============================================================ */

const keys = {};

window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (
        [
            "KeyW",
            "KeyA",
            "KeyS",
            "KeyD",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Space"
        ].includes(e.code)
    ) {
        e.preventDefault();
    }
});

window.addEventListener("keyup", e => {
    keys[e.code] = false;
});

let mouseLocked = false;

canvas.addEventListener("click", () => {

    canvas.requestPointerLock();

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    document
        .getElementById("clickToStart")
        .classList.remove("visible");
});

document.addEventListener(
    "pointerlockchange",
    () => {
        mouseLocked =
            document.pointerLockElement === canvas;
    }
);

document.addEventListener(
    "mousemove",
    e => {

        if (!mouseLocked) return;

        player.yaw -= e.movementX * 0.0022;

        player.pitch -= e.movementY * 0.0018;

        player.pitch =
            Math.max(
                -1.15,
                Math.min(1.15, player.pitch)
            );
    }
);

/* ============================================================
   AUDIO
   ============================================================ */

const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

const audioContext =
    new AudioContext();

let windGain;
let windFilter;

function createAudio() {

    const noiseBuffer =
        audioContext.createBuffer(
            1,
            audioContext.sampleRate * 4,
            audioContext.sampleRate
        );

    const data =
        noiseBuffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] =
            Math.random() * 2 - 1;
    }

    const source =
        audioContext.createBufferSource();

    source.buffer = noiseBuffer;
    source.loop = true;

    windFilter =
        audioContext.createBiquadFilter();

    windFilter.type = "lowpass";
    windFilter.frequency.value = 650;

    windGain =
        audioContext.createGain();

    windGain.gain.value = 0.028;

    source
        .connect(windFilter)
        .connect(windGain)
        .connect(audioContext.destination);

    source.start();
}

createAudio();

function playTone(
    frequency,
    duration,
    volume,
    type = "sine"
) {

    if (audioContext.state !== "running") {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = type;

    oscillator.frequency.value =
        frequency;

    gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.03
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration
    );

    oscillator
        .connect(gain)
        .connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + duration + 0.05
    );
}

function playFootstep() {

    if (audioContext.state !== "running") {
        return;
    }

    const duration = 0.08;

    const buffer =
        audioContext.createBuffer(
            1,
            Math.floor(
                audioContext.sampleRate * duration
            ),
            audioContext.sampleRate
        );

    const data =
        buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {

        const t =
            i / data.length;

        data[i] =
            (Math.random() * 2 - 1) *
            Math.pow(1 - t, 4);
    }

    const source =
        audioContext.createBufferSource();

    const gain =
        audioContext.createGain();

    gain.gain.value = 0.055;

    source.buffer = buffer;

    source
        .connect(gain)
        .connect(audioContext.destination);

    source.start();
}

let footstepTimer = 0;

/* ============================================================
   FOREST OBJECTS
   ============================================================ */

const trees = [];
const landmarks = [];
const anomalies = [];

function seededRandom(n) {

    const x =
        Math.sin(
            n * 12.9898 +
            WORLD_SEED * 0.0001
        ) * 43758.5453;

    return x - Math.floor(x);
}

function makeTree(x, z, scaleValue, rotation) {

    return {
        x,
        z,
        scale: scaleValue,
        rotation,
        variant: Math.floor(
            seededRandom(
                x * 12.1 +
                z * 4.7
            ) * 3
        )
    };
}

/*
   Generate a long forest.
*/
for (let z = -180; z <= 500; z += 5) {

    const center = pathX(z);

    for (let side = -1; side <= 1; side += 2) {

        const count =
            2 +
            Math.floor(
                seededRandom(z * 0.31 + side * 7) * 3
            );

        for (let i = 0; i < count; i++) {

            const distance =
                5 +
                seededRandom(
                    z * 13 +
                    i * 91 +
                    side * 37
                ) * 25;

            const x =
                center +
                side * distance;

            const treeZ =
                z +
                (seededRandom(
                    z * 3.1 +
                    i * 17 +
                    side
                ) - 0.5) * 4;

            const scaleValue =
                0.7 +
                seededRandom(
                    z * 4.7 +
                    i * 8.1 +
                    side * 2
                ) * 1.7;

            trees.push(
                makeTree(
                    x,
                    treeZ,
                    scaleValue,
                    seededRandom(
                        z + i * 9
                    ) * TAU
                )
            );
        }
    }
}

/* ============================================================
   LANDMARKS
   ============================================================ */

function addLandmark(id, z, type) {

    landmarks.push({
        id,
        z,
        type,
        x: pathX(z),
        discovered: false,
        visits: 0
    });
}

addLandmark("L01", 55, "stone");
addLandmark("L02", 115, "dead_tree");
addLandmark("L03", 185, "post");
addLandmark("L04", 275, "stone");
addLandmark("L05", 370, "structure");

/* ============================================================
   ANOMALY STATE
   ============================================================ */

const world = {

    disturbance: 0,

    lastEventDistance: 0,

    lastEventTime: 0,

    alteredTrees: new Map(),

    missingTrees: new Set(),

    impossibleLandmark: false,

    distantFigure: null,

    pathOffset: 0,

    fogShift: 0,

    soundEvents: [],

    observedAnything: false
};

/* ============================================================
   DISTANCE / PLAYER BEHAVIOUR
   ============================================================ */

function distanceFromPath() {

    return Math.abs(
        player.position[0] -
        pathX(player.position[2])
    );
}

function updatePlayer(dt) {

    const oldX = player.position[0];
    const oldZ = player.position[2];

    let forward = 0;
    let strafe = 0;

    if (keys.KeyW || keys.ArrowUp) forward += 1;
    if (keys.KeyS || keys.ArrowDown) forward -= 1;
    if (keys.KeyA || keys.ArrowLeft) strafe -= 1;
    if (keys.KeyD || keys.ArrowRight) strafe += 1;

    player.walking =
        forward !== 0 ||
        strafe !== 0;

    if (player.walking) {

        const magnitude =
            Math.hypot(forward, strafe);

        forward /= magnitude;
        strafe /= magnitude;

        const cos =
            Math.cos(player.yaw);

        const sin =
            Math.sin(player.yaw);

        const dx =
            (-sin * forward +
             cos * strafe) *
            player.speed *
            dt;

        const dz =
            (-cos * forward -
             sin * strafe) *
            player.speed *
            dt;

        player.position[0] += dx;
        player.position[2] += dz;
    }

    player.position[1] =
        terrainHeight(
            player.position[0],
            player.position[2]
        ) + 1.7;

    const moved =
        Math.hypot(
            player.position[0] - oldX,
            player.position[2] - oldZ
        );

    player.distance += moved;

    if (!moved) {
        player.stoppedFor += dt;
    } else {
        player.stoppedFor = 0;
    }

    if (distanceFromPath() > 8) {
        player.offPathTime += dt;
    }

    const yawDelta =
        Math.abs(
            player.yaw -
            player.lastYaw
        );

    if (yawDelta > 0.25) {
        player.headingChanges++;
    }

    if (
        Math.abs(
            Math.sin(player.yaw) -
            Math.sin(player.lastYaw)
        ) > 1.7
    ) {
        player.lookBacks++;
    }

    player.lastYaw =
        player.yaw;

    if (
        player.walking &&
        moved > 0
    ) {

        footstepTimer -= dt;

        if (footstepTimer <= 0) {

            playFootstep();

            footstepTimer =
                0.42 +
                Math.random() * 0.08;
        }
    }
}

/* ============================================================
   LANDMARK DETECTION
   ============================================================ */

function updateLandmarks() {

    for (const landmark of landmarks) {

        const dx =
            player.position[0] -
            landmark.x;

        const dz =
            player.position[2] -
            landmark.z;

        const distance =
            Math.hypot(dx, dz);

        if (distance < 10) {

            if (!landmark.discovered) {

                landmark.discovered = true;
                landmark.visits++;

                player.landmarksSeen.add(
                    landmark.id
                );

                savedState.landmarks[
                    landmark.id
                ] =
                    (savedState.landmarks[
                        landmark.id
                    ] || 0) + 1;

                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(savedState)
                );

                world.disturbance += 0.14;

            } else {

                landmark.visits++;

                /*
                   Revisiting matters.
                */
                if (landmark.visits > 1) {

                    player.revisits++;

                    world.disturbance +=
                        0.025;
                }
            }

            landmark.lastDistance =
                distance;
        }
    }
}

/* ============================================================
   REACTIVE ANOMALY ENGINE
   ============================================================ */

function randomChance(probability) {
    return Math.random() < probability;
}

function canTriggerEvent() {

    const distanceSince =
        player.distance -
        world.lastEventDistance;

    const timeSince =
        player.time -
        world.lastEventTime;

    return (
        distanceSince > 18 &&
        timeSince > 12
    );
}

function triggerAnomaly() {

    if (!canTriggerEvent()) {
        return;
    }

    /*
       Probability is based on behaviour,
       not elapsed time.
    */

    let probability = 0.015;

    probability +=
        Math.min(
            player.revisits * 0.006,
            0.08
        );

    probability +=
        Math.min(
            player.lookBacks * 0.002,
            0.07
        );

    probability +=
        Math.min(
            player.offPathTime * 0.001,
            0.08
        );

    probability +=
        Math.min(
            world.disturbance * 0.018,
            0.10
        );

    if (
        player.stoppedFor > 4
    ) {
        probability += 0.035;
    }

    if (!randomChance(probability)) {
        return;
    }

    world.lastEventDistance =
        player.distance;

    world.lastEventTime =
        player.time;

    const roll =
        Math.random();

    if (roll < 0.20) {
        alterNearbyTree();

    } else if (roll < 0.38) {
        moveLandmark();

    } else if (roll < 0.53) {
        createImpossibleTree();

    } else if (roll < 0.67) {
        triggerDistantSound();

    } else if (roll < 0.80) {
        createDistantPresence();

    } else if (roll < 0.91) {
        distortPath();

    } else {
        createHumanTrace();
    }
}

/* ============================================================
   TREE ANOMALIES
   ============================================================ */

function alterNearbyTree() {

    let closest = null;
    let closestDistance = Infinity;

    for (const tree of trees) {

        const dx =
            tree.x -
            player.position[0];

        const dz =
            tree.z -
            player.position[2];

        const d =
            Math.hypot(dx, dz);

        if (
            d > 10 &&
            d < 32 &&
            d < closestDistance
        ) {
            closest = tree;
            closestDistance = d;
        }
    }

    if (!closest) return;

    const key =
        `${closest.x.toFixed(1)}:${closest.z.toFixed(1)}`;

    world.alteredTrees.set(
        key,
        {
            x: closest.x,
            z: closest.z,
            scale: closest.scale * 1.8,
            rotation:
                closest.rotation + Math.PI * 0.65
        }
    );

    world.disturbance += 0.16;

    savedState.anomaliesSeen.push(
        "tree_" + key
    );

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedState)
    );
}

function createImpossibleTree() {

    const angle =
        player.yaw +
        Math.PI +
        (Math.random() - 0.5) * 0.5;

    const distance =
        18 +
        Math.random() * 10;

    const x =
        player.position[0] +
        Math.sin(angle) * distance;

    const z =
        player.position[2] -
        Math.cos(angle) * distance;

    const tree = makeTree(
        x,
        z,
        3.0 + Math.random() * 1.5,
        Math.random() * TAU
    );

    tree.impossible = true;

    trees.push(tree);

    world.disturbance += 0.12;
}

/* ============================================================
   LANDMARK MUTATION
   ============================================================ */

function moveLandmark() {

    if (!landmarks.length) return;

    const landmark =
        landmarks[
            Math.floor(
                Math.random() *
                landmarks.length
            )
        ];

    /*
       It doesn't teleport dramatically.
       It is simply no longer where the player remembers it.
    */

    landmark.z +=
        (Math.random() > 0.5 ? 1 : -1) *
        (14 + Math.random() * 28);

    landmark.x =
        pathX(landmark.z) +
        (Math.random() - 0.5) * 2;

    world.impossibleLandmark = true;

    world.disturbance += 0.18;
}

/* ============================================================
   PATH MUTATION
   ============================================================ */

function distortPath() {

    world.pathOffset +=
        (Math.random() - 0.5) * 5;

    world.disturbance += 0.18;
}

/*
   Replace normal path temporarily.
*/
function currentPathX(z) {

    return (
        pathX(z) +
        world.pathOffset *
        Math.exp(
            -Math.abs(
                z - player.position[2]
            ) / 65
        )
    );
}

/* ============================================================
   SOUNDS
   ============================================================ */

function triggerDistantSound() {

    if (
        audioContext.state !== "running"
    ) {
        return;
    }

    /*
       Deliberately not a monster sound.
       A low, distant tonal event.
    */

    const frequency =
        55 +
        Math.random() * 35;

    playTone(
        frequency,
        2.5 +
        Math.random() * 2,
        0.018,
        "sine"
    );

    world.disturbance += 0.10;
}

/* ============================================================
   DISTANT PRESENCE
   ============================================================ */

function createDistantPresence() {

    const angle =
        player.yaw +
        Math.PI +
        (Math.random() - 0.5) * 0.8;

    const distance =
        24 +
        Math.random() * 15;

    world.distantFigure = {

        x:
            player.position[0] +
            Math.sin(angle) * distance,

        z:
            player.position[2] -
            Math.cos(angle) * distance,

        createdAt:
            player.time,

        lifetime:
            4 +
            Math.random() * 5
    };

    world.disturbance += 0.16;
}

/* ============================================================
   HUMAN TRACE
   ============================================================ */

function createHumanTrace() {

    /*
       A small object near the path.
       No explanation.
    */

    const z =
        player.position[2] +
        (Math.random() > 0.5 ? 1 : -1) *
        (8 + Math.random() * 15);

    const x =
        currentPathX(z) +
        (Math.random() - 0.5) * 3;

    anomalies.push({
        type: "trace",
        x,
        z,
        createdAt: player.time,
        scale: 0.6
    });

    world.disturbance += 0.11;
}

/* ============================================================
   WORLD UPDATE
   ============================================================ */

function updateWorld(dt) {

    player.time += dt;

    updatePlayer(dt);

    updateLandmarks();

    /*
       Slowly decay disturbance.
       The world can become quiet again.
    */
    world.disturbance *=
        Math.pow(0.985, dt * 60);

    world.disturbance =
        Math.max(
            0,
            Math.min(
                1,
                world.disturbance
            )
        );

    triggerAnomaly();

    if (
        world.distantFigure &&
        player.time -
        world.distantFigure.createdAt >
        world.distantFigure.lifetime
    ) {
        world.distantFigure = null;
    }

    if (
        windGain
    ) {

        const target =
            0.024 +
            world.disturbance * 0.018;

        windGain.gain.linearRampToValueAtTime(
            target,
            audioContext.currentTime + 1
        );
    }
}

/* ============================================================
   DRAW HELPERS
   ============================================================ */

function bindMesh(mesh) {

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        mesh.vertexBuffer
    );

    const stride = 8 * 4;

    gl.enableVertexAttribArray(aPosition);

    gl.vertexAttribPointer(
        aPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
    );

    gl.enableVertexAttribArray(aNormal);

    gl.vertexAttribPointer(
        aNormal,
        3,
        gl.FLOAT,
        false,
        stride,
        12
    );

    gl.enableVertexAttribArray(aUV);

    gl.vertexAttribPointer(
        aUV,
        2,
        gl.FLOAT,
        false,
        stride,
        24
    );

    gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        mesh.indexBuffer
    );
}

function drawCube(model) {

    gl.uniformMatrix4fv(
        uModel,
        false,
        new Float32Array(model)
    );

    gl.drawElements(
        gl.TRIANGLES,
        cubeMesh.count,
        gl.UNSIGNED_SHORT,
        0
    );
}

/* ============================================================
   TREE DRAWING
   ============================================================ */

function drawTree(tree) {

    const ground =
        terrainHeight(
            tree.x,
            tree.z
        );

    let scaleValue =
        tree.scale;

    let rotation =
        tree.rotation;

    const key =
        `${tree.x.toFixed(1)}:${tree.z.toFixed(1)}`;

    const altered =
        world.alteredTrees.get(key);

    if (altered) {

        scaleValue =
            altered.scale;

        rotation =
            altered.rotation;
    }

    /*
       Trunk
    */

    let model =
        multiply(
            translation(
                tree.x,
                ground + scaleValue * 1.15,
                tree.z
            ),
            multiply(
                rotationY(rotation),
                scale(
                    0.55 * scaleValue,
                    2.3 * scaleValue,
                    0.55 * scaleValue
                )
            )
        );

    drawCube(model);

    /*
       Main crown.
    */

    model =
        multiply(
            translation(
                tree.x,
                ground + scaleValue * 2.65,
                tree.z
            ),
            multiply(
                rotationY(rotation),
                scale(
                    2.8 * scaleValue,
                    2.4 * scaleValue,
                    2.8 * scaleValue
                )
            )
        );

    drawCube(model);

    /*
       Secondary crown.
    */

    model =
        multiply(
            translation(
                tree.x +
                Math.sin(rotation) *
                scaleValue *
                0.7,

                ground +
                scaleValue *
                3.8,

                tree.z +
                Math.cos(rotation) *
                scaleValue *
                0.7
            ),
            scale(
                1.8 * scaleValue,
                1.7 * scaleValue,
                1.8 * scaleValue
            )
        );

    drawCube(model);
}

/* ============================================================
   LANDMARK DRAWING
   ============================================================ */

function drawLandmark(landmark) {

    const ground =
        terrainHeight(
            landmark.x,
            landmark.z
        );

    if (landmark.type === "stone") {

        drawCube(
            multiply(
                translation(
                    landmark.x,
                    ground + 0.6,
                    landmark.z
                ),
                scale(
                    1.8,
                    1.2,
                    1.5
                )
            )
        );

    } else if (
        landmark.type === "dead_tree"
    ) {

        drawCube(
            multiply(
                translation(
                    landmark.x,
                    ground + 2.4,
                    landmark.z
                ),
                scale(
                    0.45,
                    4.8,
                    0.45
                )
            )
        );

    } else if (
        landmark.type === "post"
    ) {

        drawCube(
            multiply(
                translation(
                    landmark.x,
                    ground + 1.7,
                    landmark.z
                ),
                scale(
                    0.35,
                    3.4,
                    0.35
                )
            )
        );

    } else if (
        landmark.type === "structure"
    ) {

        drawCube(
            multiply(
                translation(
                    landmark.x,
                    ground + 1.5,
                    landmark.z
                ),
                scale(
                    3.5,
                    3,
                    2
                )
            )
        );
    }
}

/* ============================================================
   HUMAN TRACE DRAWING
   ============================================================ */

function drawTrace(trace) {

    const ground =
        terrainHeight(
            trace.x,
            trace.z
        );

    /*
       Abstract object.
       It isn't explicitly explained.
    */

    drawCube(
        multiply(
            translation(
                trace.x,
                ground + 0.25,
                trace.z
            ),
            scale(
                0.9,
                0.45,
                0.25
            )
        )
    );
}

/* ============================================================
   DISTANT FIGURE
   ============================================================ */

function drawDistantFigure() {

    if (!world.distantFigure) {
        return;
    }

    const figure =
        world.distantFigure;

    const distance =
        Math.hypot(
            figure.x -
            player.position[0],

            figure.z -
            player.position[2]
        );

    if (distance > 45) {
        return;
    }

    const ground =
        terrainHeight(
            figure.x,
            figure.z
        );

    /*
       The figure is deliberately extremely primitive.
       At fog distance it can be mistaken for a tree.
    */

    drawCube(
        multiply(
            translation(
                figure.x,
                ground + 2.1,
                figure.z
            ),
            scale(
                0.55,
                4.2,
                0.35
            )
        )
    );
}

/* ============================================================
   GROUND
   ============================================================ */

function drawGround() {

    /*
       Large flat tiles.
       Terrain height is evaluated per tile.
    */

    const centerX =
        player.position[0];

    const centerZ =
        player.position[2];

    const tileSize = 8;

    const radius = 8;

    for (
        let z = -radius;
        z <= radius;
        z++
    ) {

        for (
            let x = -radius;
            x <= radius;
            x++
        ) {

            const worldX =
                Math.floor(
                    centerX / tileSize
                ) *
                tileSize +
                x * tileSize;

            const worldZ =
                Math.floor(
                    centerZ / tileSize
                ) *
                tileSize +
                z * tileSize;

            const y =
                terrainHeight(
                    worldX,
                    worldZ
                ) - 0.15;

            const model =
                multiply(
                    translation(
                        worldX,
                        y,
                        worldZ
                    ),
                    scale(
                        tileSize,
                        0.25,
                        tileSize
                    )
                );

            drawCube(model);
        }
    }
}

/* ============================================================
   PATH
   ============================================================ */

function drawPath() {

    const centerZ =
        player.position[2];

    for (
        let i = -10;
        i <= 16;
        i++
    ) {

        const z =
            centerZ +
            i * 7;

        const x =
            currentPathX(z);

        const y =
            terrainHeight(
                x,
                z
            ) - 0.005;

        const width =
            3.0 +
            Math.sin(z * 0.03) *
            0.6;

        drawCube(
            multiply(
                translation(
                    x,
                    y,
                    z
                ),
                scale(
                    width,
                    0.08,
                    7.2
                )
            )
        );
    }
}

/* ============================================================
   CAMERA
   ============================================================ */

function getCameraTarget() {

    const cosPitch =
        Math.cos(player.pitch);

    const sinPitch =
        Math.sin(player.pitch);

    const horizontalX =
        -Math.sin(player.yaw) *
        cosPitch;

    const horizontalY =
        sinPitch;

    const horizontalZ =
        -Math.cos(player.yaw) *
        cosPitch;

    return [
        player.position[0] +
            horizontalX,

        player.position[1] +
            horizontalY,

        player.position[2] +
            horizontalZ
    ];
}

/* ============================================================
   RENDER
   ============================================================ */

function render(time) {

    const seconds =
        time * 0.001;

    updateWorld(
        Math.min(
            0.05,
            seconds -
            (render.previousTime || seconds)
        )
    );

    render.previousTime =
        seconds;

    gl.enable(gl.DEPTH_TEST);

    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(
        0.006,
        0.009,
        0.008,
        1
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.useProgram(program);

    bindMesh(cubeMesh);

    const aspect =
        canvas.width /
        canvas.height;

    const projection =
        perspective(
            Math.PI / 2.8,
            aspect,
            0.1,
            180
        );

    const target =
        getCameraTarget();

    const view =
        lookAt(
            player.position,
            target,
            [0,1,0]
        );

    gl.uniformMatrix4fv(
        uProjection,
        false,
        new Float32Array(projection)
    );

    gl.uniformMatrix4fv(
        uView,
        false,
        new Float32Array(view)
    );

    gl.uniform3fv(
        uCameraPosition,
        new Float32Array(
            player.position
        )
    );

    /*
       Flashlight.
       In this implementation it is approximated by a
       strong local point light positioned slightly ahead
       of the player's head.
    */

    const lightDistance = 2.0;

    const lightX =
        player.position[0] -
        Math.sin(player.yaw) *
        lightDistance;

    const lightY =
        player.position[1] -
        Math.sin(player.pitch) *
        0.4;

    const lightZ =
        player.position[2] -
        Math.cos(player.yaw) *
        lightDistance;

    gl.uniform3fv(
        uLightPosition,
        new Float32Array([
            lightX,
            lightY,
            lightZ
        ])
    );

    gl.uniform3fv(
        uLightColor,
        new Float32Array([
            0.72,
            0.86,
            0.82
        ])
    );

    gl.uniform1f(
        uFogNear,
        7.0
    );

    gl.uniform1f(
        uFogFar,
        48.0 -
        world.disturbance * 10
    );

    gl.uniform1f(
        uTime,
        seconds
    );

    gl.uniform1f(
        uWorldDisturbance,
        world.disturbance
    );

    /*
       Draw order doesn't matter for depth-tested opaque
       geometry.
    */

    drawGround();

    drawPath();

    /*
       Only draw nearby trees for performance.
    */

    for (const tree of trees) {

        const dx =
            tree.x -
            player.position[0];

        const dz =
            tree.z -
            player.position[2];

        if (
            Math.abs(dz) > 70 ||
            Math.abs(dx) > 65
        ) {
            continue;
        }

        drawTree(tree);
    }

    for (const landmark of landmarks) {

        const dz =
            landmark.z -
            player.position[2];

        if (
            Math.abs(dz) < 75
        ) {
            drawLandmark(landmark);
        }
    }

    for (const trace of anomalies) {

        const dz =
            trace.z -
            player.position[2];

        if (
            Math.abs(dz) < 55
        ) {
            drawTrace(trace);
        }
    }

    drawDistantFigure();

    requestAnimationFrame(render);
}

/* ============================================================
   START
   ============================================================ */

setTimeout(() => {

    document
        .getElementById("boot")
        .classList.add("hidden");

    document
        .getElementById("clickToStart")
        .classList.add("visible");

}, 1600);

requestAnimationFrame(render);
