const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL is not supported.");
    throw new Error("WebGL not supported");
}

/* =========================================================
   SHADERS
   ========================================================= */

const vertexShaderSource = `
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_worldPosition;
varying vec3 v_normal;

void main() {
    vec4 worldPosition = u_model * vec4(a_position, 1.0);

    v_worldPosition = worldPosition.xyz;
    v_normal = mat3(u_model) * a_normal;

    gl_Position =
        u_projection *
        u_view *
        worldPosition;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec3 v_worldPosition;
varying vec3 v_normal;

uniform vec3 u_cameraPosition;
uniform float u_time;
uniform float u_fogDensity;
uniform float u_flash;
uniform float u_redLight;

void main() {

    vec3 normal = normalize(v_normal);

    /*
     * Main light.
     */
    vec3 lightPosition = vec3(0.0, 3.5, 0.0);

    vec3 lightDirection =
        normalize(lightPosition - v_worldPosition);

    float diffuse =
        max(dot(normal, lightDirection), 0.0);

    /*
     * Very weak ambient illumination.
     */
    float ambient = 0.18;

    float light =
        ambient +
        diffuse * 0.48;

    /*
     * Slight vertical variation.
     */
    float vertical =
        clamp(v_worldPosition.y / 4.0, 0.0, 1.0);

    vec3 baseColor =
        vec3(
            0.28 + vertical * 0.03,
            0.30 + vertical * 0.03,
            0.31 + vertical * 0.04
        );

    vec3 color =
        baseColor * light;

    /*
     * Subtle noise-like temporal modulation.
     */
    float noise =
        sin(
            v_worldPosition.x * 7.13 +
            v_worldPosition.z * 4.91 +
            u_time * 3.0
        ) * 0.008;

    color += noise;

    /*
     * Red event light.
     */
    color += vec3(
        u_redLight * 0.35,
        0.0,
        0.0
    );

    /*
     * White flash.
     */
    color += vec3(u_flash);

    /*
     * Distance fog.
     */
    float distanceFromCamera =
        distance(
            v_worldPosition,
            u_cameraPosition
        );

    float fog =
        1.0 -
        exp(
            -u_fogDensity *
            distanceFromCamera *
            distanceFromCamera
        );

    vec3 fogColor =
        vec3(
            0.008,
            0.010,
            0.012
        );

    color =
        mix(
            color,
            fogColor,
            clamp(fog, 0.0, 0.97)
        );

    gl_FragColor =
        vec4(color, 1.0);
}
`;

/* =========================================================
   SHADER COMPILATION
   ========================================================= */

function createShader(type, source) {

    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
            gl.getShaderInfoLog(shader)
        );

        throw new Error(
            "Shader compilation failed"
        );
    }

    return shader;
}

function createProgram(vertexSource, fragmentSource) {

    const vertexShader =
        createShader(
            gl.VERTEX_SHADER,
            vertexSource
        );

    const fragmentShader =
        createShader(
            gl.FRAGMENT_SHADER,
            fragmentSource
        );

    const program =
        gl.createProgram();

    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );

    gl.linkProgram(program);

    if (!gl.getProgramParameter(
        program,
        gl.LINK_STATUS
    )) {

        console.error(
            gl.getProgramInfoLog(program)
        );

        throw new Error(
            "Program linking failed"
        );
    }

    return program;
}

const program =
    createProgram(
        vertexShaderSource,
        fragmentShaderSource
    );

gl.useProgram(program);

/* =========================================================
   LOCATIONS
   ========================================================= */

const positionLocation =
    gl.getAttribLocation(
        program,
        "a_position"
    );

const normalLocation =
    gl.getAttribLocation(
        program,
        "a_normal"
    );

const modelLocation =
    gl.getUniformLocation(
        program,
        "u_model"
    );

const viewLocation =
    gl.getUniformLocation(
        program,
        "u_view"
    );

const projectionLocation =
    gl.getUniformLocation(
        program,
        "u_projection"
    );

const cameraPositionLocation =
    gl.getUniformLocation(
        program,
        "u_cameraPosition"
    );

const timeLocation =
    gl.getUniformLocation(
        program,
        "u_time"
    );

const fogDensityLocation =
    gl.getUniformLocation(
        program,
        "u_fogDensity"
    );

const flashLocation =
    gl.getUniformLocation(
        program,
        "u_flash"
    );

const redLightLocation =
    gl.getUniformLocation(
        program,
        "u_redLight"
    );

/* =========================================================
   CUBE GEOMETRY
   ========================================================= */

const cubeVertices = [

    // Front
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,

    // Back
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,

    // Left
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,

    // Right
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,

    // Top
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,

    // Bottom
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5
];

const cubeNormals = [

     // Front
     0, 0, 1,
     0, 0, 1,
     0, 0, 1,
     0, 0, 1,

     // Back
     0, 0, -1,
     0, 0, -1,
     0, 0, -1,
     0, 0, -1,

     // Left
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,

     // Right
     1, 0, 0,
     1, 0, 0,
     1, 0, 0,
     1, 0, 0,

     // Top
     0, 1, 0,
     0, 1, 0,
     0, 1, 0,
     0, 1, 0,

     // Bottom
     0, -1, 0,
     0, -1, 0,
     0, -1, 0,
     0, -1, 0
];

const cubeIndices = [

     0, 1, 2,
     0, 2, 3,

     4, 5, 6,
     4, 6, 7,

     8, 9, 10,
     8, 10, 11,

     12, 13, 14,
     12, 14, 15,

     16, 17, 18,
     16, 18, 19,

     20, 21, 22,
     20, 22, 23
];

/* =========================================================
   BUFFERS
   ========================================================= */

const positionBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    positionBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(cubeVertices),
    gl.STATIC_DRAW
);

const normalBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    normalBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(cubeNormals),
    gl.STATIC_DRAW
);

const indexBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,
    indexBuffer
);

gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(cubeIndices),
    gl.STATIC_DRAW
);

/* =========================================================
   MATRIX FUNCTIONS
   ========================================================= */

function identity() {

    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

function translation(x, y, z) {

    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

function scale(x, y, z) {

    return [
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    ];
}

function rotationX(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
}

function rotationY(angle) {

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];
}

function multiply(a, b) {

    const result =
        new Array(16);

    for (let row = 0; row < 4; row++) {

        for (let col = 0; col < 4; col++) {

            result[
                row * 4 + col
            ] =
                a[row * 4 + 0] *
                b[0 * 4 + col] +

                a[row * 4 + 1] *
                b[1 * 4 + col] +

                a[row * 4 + 2] *
                b[2 * 4 + col] +

                a[row * 4 + 3] *
                b[3 * 4 + col];
        }
    }

    return result;
}

function perspective(
    fov,
    aspect,
    near,
    far
) {

    const f =
        1 /
        Math.tan(fov / 2);

    const range =
        near - far;

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / range, -1,
        0, 0, (2 * far * near) / range, 0
    ];
}

/* =========================================================
   CAMERA
   ========================================================= */

const camera = {

    position: {
        x: 0,
        y: 1.7,
        z: 8
    },

    yaw: 0,
    pitch: 0,

    speed: 3.2
};

/* =========================================================
   INPUT
   ========================================================= */

const keys = {};

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Enter" &&
            !pointerLocked
        ) {

            canvas.requestPointerLock();

            startAudio();
        }
    }
);

window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);

/* =========================================================
   POINTER LOCK
   ========================================================= */

let pointerLocked = false;

canvas.addEventListener(
    "click",
    () => {

        canvas.requestPointerLock();

        startAudio();
    }
);

document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement === canvas;

        document.getElementById(
            "status"
        ).textContent =
            pointerLocked
                ? "WASD / MOUSE"
                : "CLICK OR ENTER";
    }
);

document.addEventListener(
    "mousemove",
    event => {

        if (!pointerLocked)
            return;

        const sensitivity = 0.0018;

        camera.yaw -=
            event.movementX *
            sensitivity;

        camera.pitch -=
            event.movementY *
            sensitivity;

        const limit =
            Math.PI / 2 - 0.05;

        camera.pitch =
            Math.max(
                -limit,
                Math.min(
                    limit,
                    camera.pitch
                )
            );
    }
);

/* =========================================================
   AUDIO
   ========================================================= */

let audioContext = null;
let masterGain = null;
let droneOscillator = null;

function startAudio() {

    if (audioContext)
        return;

    audioContext =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    masterGain =
        audioContext.createGain();

    masterGain.gain.value =
        0.045;

    masterGain.connect(
        audioContext.destination
    );

    droneOscillator =
        audioContext.createOscillator();

    droneOscillator.type =
        "sine";

    droneOscillator.frequency.value =
        47;

    droneOscillator.connect(
        masterGain
    );

    droneOscillator.start();
}

function playStep() {

    if (!audioContext)
        return;

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type =
        "triangle";

    oscillator.frequency.value =
        65 +
        Math.random() * 20;

    gain.gain.setValueAtTime(
        0.0,
        audioContext.currentTime
    );

    gain.gain.linearRampToValueAtTime(
        0.07,
        audioContext.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.16
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.18
    );
}

/* =========================================================
   ROOM
   ========================================================= */

const objects = [

    /*
     * Floor
     */
    {
        position: [0, -0.1, 0],
        scale: [10, 0.2, 80]
    },

    /*
     * Ceiling
     */
    {
        position: [0, 4, 0],
        scale: [10, 0.2, 80]
    },

    /*
     * Left wall
     */
    {
        position: [-5, 2, 0],
        scale: [0.2, 4, 80]
    },

    /*
     * Right wall
     */
    {
        position: [5, 2, 0],
        scale: [0.2, 4, 80]
    }
];

/* =========================================================
   DISTANT OBJECTS
   ========================================================= */

const anomalies = [

    {
        position: [0, 1.2, -22],
        scale: [1.0, 2.4, 1.0],
        visible: false
    },

    {
        position: [0, 1.2, -42],
        scale: [1.0, 2.4, 1.0],
        visible: false
    }
];

/* =========================================================
   EVENT SYSTEM
   ========================================================= */

let flash = 0;
let redLight = 0;

let eventTimer =
    8 + Math.random() * 8;

let eventMessage =
    "";

let messageTimer =
    0;

function triggerEvent() {

    const event =
        Math.floor(
            Math.random() * 5
        );

    if (event === 0) {

        /*
         * Camera flash.
         */
        flash = 1;

        eventMessage =
            "IMAGE ERROR";

        messageTimer = 1.0;
    }

    if (event === 1) {

        /*
         * Red light.
         */
        redLight = 1;

        eventMessage =
            "SIGNAL LOST";

        messageTimer = 2.0;
    }

    if (event === 2) {

        /*
         * Show distant figure.
         */
        anomalies[
            Math.floor(
                Math.random() *
                anomalies.length
            )
        ].visible = true;

        eventMessage =
            "OBJECT DETECTED";

        messageTimer = 1.5;
    }

    if (event === 3) {

        eventMessage =
            "DO NOT TURN AROUND";

        messageTimer = 2.0;
    }

    if (event === 4) {

        eventMessage =
            "ROOM_01";

        messageTimer = 1.0;
    }

    eventTimer =
        10 + Math.random() * 15;
}

/* =========================================================
   CAMERA MOVEMENT
   ========================================================= */

let stepTimer = 0;

function updateCamera(deltaTime) {

    if (!pointerLocked)
        return;

    let forward = 0;
    let right = 0;

    if (keys["KeyW"])
        forward += 1;

    if (keys["KeyS"])
        forward -= 1;

    if (keys["KeyD"])
        right += 1;

    if (keys["KeyA"])
        right -= 1;

    const length =
        Math.hypot(
            forward,
            right
        );

    if (length === 0) {

        stepTimer = 0;

        return;
    }

    forward /= length;
    right /= length;

    const speed =
        camera.speed *
        deltaTime;

    const sin =
        Math.sin(camera.yaw);

    const cos =
        Math.cos(camera.yaw);

    camera.position.x +=
        (
            -sin * forward +
            cos * right
        ) *
        speed;

    camera.position.z +=
        (
            -cos * forward -
            sin * right
        ) *
        speed;

    /*
     * Collision with walls.
     */
    const wallLimit = 4.3;

    camera.position.x =
        Math.max(
            -wallLimit,
            Math.min(
                wallLimit,
                camera.position.x
            )
        );

    /*
     * Keep player inside corridor.
     */
    const start =
        -0.5;

    const end =
        37;

    camera.position.z =
        Math.max(
            -end,
            Math.min(
                start,
                camera.position.z
            )
        );

    /*
     * Footsteps.
     */
    stepTimer -= deltaTime;

    if (stepTimer <= 0) {

        playStep();

        stepTimer =
            0.42;
    }
}

/* =========================================================
   VIEW MATRIX
   ========================================================= */

function getViewMatrix() {

    const cameraTranslation =
        translation(
            -camera.position.x,
            -camera.position.y,
            -camera.position.z
        );

    const pitch =
        rotationX(
            -camera.pitch
        );

    const yaw =
        rotationY(
            -camera.yaw
        );

    return multiply(
        pitch,
        multiply(
            yaw,
            cameraTranslation
        )
    );
}

/* =========================================================
   DRAW CUBE
   ========================================================= */

function drawCube(
    position,
    size,
    view,
    projection,
    time
) {

    const model =
        multiply(
            translation(
                position[0],
                position[1],
                position[2]
            ),
            scale(
                size[0],
                size[1],
                size[2]
            )
        );

    gl.uniformMatrix4fv(
        modelLocation,
        false,
        model
    );

    gl.uniformMatrix4fv(
        viewLocation,
        false,
        view
    );

    gl.uniformMatrix4fv(
        projectionLocation,
        false,
        projection
    );

    gl.uniform3f(
        cameraPositionLocation,
        camera.position.x,
        camera.position.y,
        camera.position.z
    );

    gl.uniform1f(
        timeLocation,
        time
    );

    gl.uniform1f(
        fogDensityLocation,
        0.0028
    );

    gl.uniform1f(
        flashLocation,
        flash * 0.8
    );

    gl.uniform1f(
        redLightLocation,
        redLight
    );

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        positionBuffer
    );

    gl.enableVertexAttribArray(
        positionLocation
    );

    gl.vertexAttribPointer(
        positionLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        normalBuffer
    );

    gl.enableVertexAttribArray(
        normalLocation
    );

    gl.vertexAttribPointer(
        normalLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        indexBuffer
    );

    gl.drawElements(
        gl.TRIANGLES,
        cubeIndices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}

/* =========================================================
   HUD
   ========================================================= */

function updateHUD() {

    const status =
        document.getElementById(
            "status"
        );

    if (
        messageTimer > 0 &&
        eventMessage
    ) {

        status.textContent =
            eventMessage;

        status.style.color =
            redLight > 0
                ? "#ff3030"
                : "#b8ff00";

        return;
    }

    status.textContent =
        pointerLocked
            ? ""
            : "CLICK OR ENTER";

    status.style.color =
        "#a0a0a0";
}

/* =========================================================
   RESIZE
   ========================================================= */

function resize() {

    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    const width =
        Math.floor(
            canvas.clientWidth * dpr
        );

    const height =
        Math.floor(
            canvas.clientHeight * dpr
        );

    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {

        canvas.width = width;
        canvas.height = height;
    }

    gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

window.addEventListener(
    "resize",
    resize
);

/* =========================================================
   RENDER LOOP
   ========================================================= */

let previousTime =
    performance.now();

function render(currentTime) {

    const deltaTime =
        Math.min(
            (currentTime - previousTime) /
            1000,
            0.05
        );

    previousTime =
        currentTime;

    const time =
        currentTime / 1000;

    resize();

    updateCamera(
        deltaTime
    );

    /*
     * Events.
     */
    eventTimer -= deltaTime;

    if (eventTimer <= 0) {
        triggerEvent();
    }

    /*
     * Fade effects.
     */
    flash =
        Math.max(
            0,
            flash - deltaTime * 5
        );

    redLight =
        Math.max(
            0,
            redLight - deltaTime * 0.7
        );

    messageTimer =
        Math.max(
            0,
            messageTimer - deltaTime
        );

    updateHUD();

    /*
     * Clear.
     */
    gl.clearColor(
        0.003,
        0.004,
        0.005,
        1
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.enable(
        gl.DEPTH_TEST
    );

    /*
     * Slightly darker rendering.
     */
    gl.enable(
        gl.CULL_FACE
    );

    const aspect =
        canvas.width /
        canvas.height;

    const projection =
        perspective(
            Math.PI / 3,
            aspect,
            0.1,
            100
        );

    const view =
        getViewMatrix();

    /*
     * Room.
     */
    for (
        const object of objects
    ) {

        drawCube(
            object.position,
            object.scale,
            view,
            projection,
            time
        );
    }

    /*
     * Anomalies.
     */
    for (
        const anomaly of anomalies
    ) {

        if (!anomaly.visible)
            continue;

        drawCube(
            anomaly.position,
            anomaly.scale,
            view,
            projection,
            time
        );
    }

    requestAnimationFrame(
        render
    );
}

/* =========================================================
   START
   ========================================================= */

resize();

requestAnimationFrame(
    render
);
