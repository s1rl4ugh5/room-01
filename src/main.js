/* =========================================================
   ROOM_01
   A small WebGL horror experiment.
   No engine.
   No external assets.
   ========================================================= */

const canvas =
    document.getElementById("canvas");

const gl =
    canvas.getContext("webgl");

if (!gl) {

    throw new Error(
        "WebGL is not supported."
    );
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

varying vec3 v_position;
varying vec3 v_normal;

void main() {

    vec4 world =
        u_model *
        vec4(a_position, 1.0);

    v_position =
        world.xyz;

    v_normal =
        mat3(u_model) *
        a_normal;

    gl_Position =
        u_projection *
        u_view *
        world;
}
`;

const fragmentShaderSource = `

precision mediump float;

varying vec3 v_position;
varying vec3 v_normal;

uniform vec3 u_camera;
uniform float u_time;

uniform float u_flicker;
uniform float u_flash;

uniform float u_red;

void main() {

    vec3 normal =
        normalize(v_normal);

    /*
     * Fluorescent light source.
     */

    vec3 lightA =
        vec3(
            0.0,
            3.5,
            0.0
        );

    vec3 direction =
        normalize(
            lightA -
            v_position
        );

    float diffuse =
        max(
            dot(
                normal,
                direction
            ),
            0.0
        );

    /*
     * Very weak ambient light.
     */

    float ambient =
        0.105;

    float illumination =
        ambient +
        diffuse * 0.55;

    /*
     * Slight vertical gradient.
     */

    float vertical =
        clamp(
            v_position.y / 4.0,
            0.0,
            1.0
        );

    vec3 base =
        vec3(
            0.27,
            0.28,
            0.28
        );

    base +=
        vertical *
        vec3(
            0.025,
            0.025,
            0.025
        );

    vec3 color =
        base *
        illumination;

    /*
     * Fluorescent flicker.
     */

    color *=
        0.55 +
        u_flicker * 0.45;

    /*
     * Red emergency light.
     */

    color +=
        vec3(
            u_red * 0.18,
            0.0,
            0.0
        );

    /*
     * White flash.
     */

    color +=
        vec3(
            u_flash * 0.9
        );

    /*
     * Distance fog.
     */

    float distanceToCamera =
        distance(
            v_position,
            u_camera
        );

    float fog =
        1.0 -
        exp(
            -0.0031 *
            distanceToCamera *
            distanceToCamera
        );

    vec3 fogColor =
        vec3(
            0.004,
            0.0045,
            0.0045
        );

    color =
        mix(
            color,
            fogColor,
            clamp(
                fog,
                0.0,
                0.985
            )
        );

    gl_FragColor =
        vec4(
            color,
            1.0
        );
}
`;

/* =========================================================
   SHADER HELPERS
   ========================================================= */

function compileShader(
    type,
    source
) {

    const shader =
        gl.createShader(type);

    gl.shaderSource(
        shader,
        source
    );

    gl.compileShader(shader);

    if (
        !gl.getShaderParameter(
            shader,
            gl.COMPILE_STATUS
        )
    ) {

        console.error(
            gl.getShaderInfoLog(shader)
        );

        throw new Error(
            "Shader compilation failed."
        );
    }

    return shader;
}

function createProgram() {

    const vertex =
        compileShader(
            gl.VERTEX_SHADER,
            vertexShaderSource
        );

    const fragment =
        compileShader(
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );

    const program =
        gl.createProgram();

    gl.attachShader(
        program,
        vertex
    );

    gl.attachShader(
        program,
        fragment
    );

    gl.linkProgram(program);

    if (
        !gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        )
    ) {

        console.error(
            gl.getProgramInfoLog(program)
        );

        throw new Error(
            "Program linking failed."
        );
    }

    return program;
}

const program =
    createProgram();

gl.useProgram(program);

/* =========================================================
   ATTRIBUTES / UNIFORMS
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

const cameraLocation =
    gl.getUniformLocation(
        program,
        "u_camera"
    );

const timeLocation =
    gl.getUniformLocation(
        program,
        "u_time"
    );

const flickerLocation =
    gl.getUniformLocation(
        program,
        "u_flicker"
    );

const flashLocation =
    gl.getUniformLocation(
        program,
        "u_flash"
    );

const redLocation =
    gl.getUniformLocation(
        program,
        "u_red"
    );

/* =========================================================
   CUBE
   ========================================================= */

const vertices = [

    // FRONT
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,

    // BACK
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,

    // LEFT
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,

    // RIGHT
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,

    // TOP
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,

    // BOTTOM
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5
];

const normals = [

    // FRONT
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,

    // BACK
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,

    // LEFT
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,

    // RIGHT
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,

    // TOP
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,

    // BOTTOM
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0
];

const indices = [

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
    new Float32Array(vertices),
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
    new Float32Array(normals),
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
    new Uint16Array(indices),
    gl.STATIC_DRAW
);

/* =========================================================
   MATRIX
   ========================================================= */

function identity() {

    return [

        1, 0, 0, 0,

        0, 1, 0, 0,

        0, 0, 1, 0,

        0, 0, 0, 1
    ];
}

function translation(
    x,
    y,
    z
) {

    return [

        1, 0, 0, 0,

        0, 1, 0, 0,

        0, 0, 1, 0,

        x, y, z, 1
    ];
}

function scale(
    x,
    y,
    z
) {

    return [

        x, 0, 0, 0,

        0, y, 0, 0,

        0, 0, z, 0,

        0, 0, 0, 1
    ];
}

function rotationX(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return [

        1, 0, 0, 0,

        0, c, s, 0,

        0, -s, c, 0,

        0, 0, 0, 1
    ];
}

function rotationY(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return [

        c, 0, -s, 0,

        0, 1, 0, 0,

        s, 0, c, 0,

        0, 0, 0, 1
    ];
}

function multiply(
    a,
    b
) {

    const result =
        new Array(16);

    for (
        let row = 0;
        row < 4;
        row++
    ) {

        for (
            let col = 0;
            col < 4;
            col++
        ) {

            result[
                row * 4 + col
            ] =
                a[row * 4] *
                b[col] +

                a[row * 4 + 1] *
                b[col + 4] +

                a[row * 4 + 2] *
                b[col + 8] +

                a[row * 4 + 3] *
                b[col + 12];
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
        Math.tan(
            fov / 2
        );

    const range =
        near - far;

    return [

        f / aspect,
        0,
        0,
        0,

        0,
        f,
        0,
        0,

        0,
        0,
        (far + near) / range,
        -1,

        0,
        0,
        (2 * far * near) / range,
        0
    ];
}

/* =========================================================
   PLAYER
   ========================================================= */

const player = {

    x: 0,

    y: 1.65,

    z: 3.5,

    yaw: 0,

    pitch: 0,

    /*
     * Smoothed camera.
     */

    targetYaw: 0,

    targetPitch: 0,

    speed: 2.0
};

/* =========================================================
   INPUT
   ========================================================= */

const keys = {};

let locked = false;

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Enter"
        ) {

            enterWorld();
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

canvas.addEventListener(
    "click",
    enterWorld
);

function enterWorld() {

    if (
        !locked
    ) {

        canvas.requestPointerLock();
    }

    startAudio();
}

document.addEventListener(
    "pointerlockchange",
    () => {

        locked =
            document.pointerLockElement ===
            canvas;

        const intro =
            document.getElementById(
                "intro"
            );

        if (locked) {

            intro.classList.add(
                "hidden"
            );

        } else {

            intro.classList.remove(
                "hidden"
            );
        }
    }
);

/* =========================================================
   MOUSE LOOK
   ========================================================= */

document.addEventListener(
    "mousemove",
    event => {

        if (!locked)
            return;

        /*
         * Horizontal head movement.
         */

        player.targetYaw -=
            event.movementX *
            0.0016;

        /*
         * Vertical head movement.
         */

        player.targetPitch -=
            event.movementY *
            0.0012;

        const limit =
            1.25;

        player.targetPitch =
            Math.max(
                -limit,
                Math.min(
                    limit,
                    player.targetPitch
                )
            );
    }
);

/* =========================================================
   AUDIO ENGINE
   ========================================================= */

let audioContext = null;

let masterGain = null;

let drone = null;

let droneGain = null;

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
        0.055;

    masterGain.connect(
        audioContext.destination
    );

    /*
     * Low frequency drone.
     */

    drone =
        audioContext.createOscillator();

    droneGain =
        audioContext.createGain();

    drone.type =
        "sine";

    drone.frequency.value =
        41;

    droneGain.gain.value =
        0.18;

    drone.connect(
        droneGain
    );

    droneGain.connect(
        masterGain
    );

    drone.start();

    /*
     * Second oscillator.
     */

    const second =
        audioContext.createOscillator();

    const secondGain =
        audioContext.createGain();

    second.type =
        "sine";

    second.frequency.value =
        73;

    secondGain.gain.value =
        0.025;

    second.connect(
        secondGain
    );

    secondGain.connect(
        masterGain
    );

    second.start();
}

function footstep() {

    if (!audioContext)
        return;

    const osc =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    osc.type =
        "triangle";

    osc.frequency.value =
        55 +
        Math.random() * 12;

    gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.075,
        audioContext.currentTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.22
    );

    osc.connect(gain);

    gain.connect(
        masterGain
    );

    osc.start();

    osc.stop(
        audioContext.currentTime +
        0.24
    );
}

function noiseBurst(
    duration = 0.12
) {

    if (!audioContext)
        return;

    const buffer =
        audioContext.createBuffer(
            1,
            audioContext.sampleRate *
            duration,
            audioContext.sampleRate
        );

    const data =
        buffer.getChannelData(0);

    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        data[i] =
            Math.random() * 2 - 1;
    }

    const source =
        audioContext.createBufferSource();

    const gain =
        audioContext.createGain();

    source.buffer =
        buffer;

    gain.gain.value =
        0.045;

    source.connect(gain);

    gain.connect(
        masterGain
    );

    source.start();
}

/* =========================================================
   WORLD
   ========================================================= */

/*
 * The corridor extends far beyond
 * what the player can normally see.
 */

const corridorLength = 180;

const worldObjects = [];

/*
 * Floor.
 */

worldObjects.push({
    x: 0,
    y: -0.1,
    z: -corridorLength / 2,
    sx: 10,
    sy: 0.2,
    sz: corridorLength
});

/*
 * Ceiling.
 */

worldObjects.push({
    x: 0,
    y: 4,
    z: -corridorLength / 2,
    sx: 10,
    sy: 0.2,
    sz: corridorLength
});

/*
 * Left wall.
 */

worldObjects.push({
    x: -5,
    y: 2,
    z: -corridorLength / 2,
    sx: 0.2,
    sy: 4,
    sz: corridorLength
});

/*
 * Right wall.
 */

worldObjects.push({
    x: 5,
    y: 2,
    z: -corridorLength / 2,
    sx: 0.2,
    sy: 4,
    sz: corridorLength
});

/* =========================================================
   WALL PANELS
   ========================================================= */

for (
    let z = 0;
    z > -corridorLength;
    z -= 5
) {

    /*
     * Left recessed panels.
     */

    worldObjects.push({
        x: -4.88,
        y: 1.9,
        z,
        sx: 0.08,
        sy: 3.3,
        sz: 3.2
    });

    /*
     * Right recessed panels.
     */

    worldObjects.push({
        x: 4.88,
        y: 1.9,
        z,
        sx: 0.08,
        sy: 3.3,
        sz: 3.2
    });
}

/* =========================================================
   CEILING LIGHTS
   ========================================================= */

const lights = [];

for (
    let z = 0;
    z > -corridorLength;
    z -= 10
) {

    lights.push({

        z,

        /*
         * Every light has its own
         * slightly different behaviour.
         */

        phase:
            Math.random() * 20,

        broken:
            Math.random() < 0.22
    });
}

/* =========================================================
   STRANGE OBJECTS
   ========================================================= */

const figures = [

    {
        x: 0,
        z: -28,
        active: false
    },

    {
        x: -2.4,
        z: -61,
        active: false
    },

    {
        x: 2.0,
        z: -96,
        active: false
    }
];

/* =========================================================
   EVENT STATE
   ========================================================= */

let flash = 0;

let red = 0;

let eventCooldown =
    12;

let eventType =
    0;

let messageTimer =
    0;

const message =
    document.getElementById(
        "message"
    );

function showMessage(
    text,
    duration
) {

    message.textContent =
        text;

    message.classList.add(
        "visible"
    );

    messageTimer =
        duration;
}

function hideMessage() {

    message.classList.remove(
        "visible"
    );
}

/* =========================================================
   ANOMALY EVENTS
   ========================================================= */

function triggerAnomaly() {

    const type =
        Math.floor(
            Math.random() * 7
        );

    eventType =
        type;

    /*
     * 0:
     * sudden white frame
     */

    if (type === 0) {

        flash = 1;

        noiseBurst(
            0.08
        );

        showMessage(
            "",
            0.12
        );
    }

    /*
     * 1:
     * distant red light
     */

    if (type === 1) {

        red = 1.0;

        showMessage(
            "...",
            0.8
        );
    }

    /*
     * 2:
     * distant human figure
     */

    if (type === 2) {

        const figure =
            figures[
                Math.floor(
                    Math.random() *
                    figures.length
                )
            ];

        figure.active =
            true;

        showMessage(
            "",
            0.5
        );
    }

    /*
     * 3:
     * strange system message
     */

    if (type === 3) {

        const texts = [

            "STOP",

            "LOOK",

            "DO NOT TURN",

            "ERROR",

            "NULL",

            "..."

        ];

        showMessage(
            texts[
                Math.floor(
                    Math.random() *
                    texts.length
                )
            ],
            0.6
        );

        noiseBurst(
            0.16
        );
    }

    /*
     * 4:
     * light failure
     */

    if (type === 4) {

        showMessage(
            "",
            0.3
        );

        red = 0.2;
    }

    /*
     * 5:
     * sound only
     */

    if (type === 5) {

        noiseBurst(
            0.45
        );
    }

    /*
     * 6:
     * figure activation + flash
     */

    if (type === 6) {

        const figure =
            figures[
                Math.floor(
                    Math.random() *
                    figures.length
                )
            ];

        figure.active =
            true;

        flash =
            0.25;

        noiseBurst(
            0.12
        );
    }

    eventCooldown =
        9 +
        Math.random() * 16;
}

/* =========================================================
   PLAYER UPDATE
   ========================================================= */

let stepTimer =
    0;

function updatePlayer(
    delta
) {

    if (!locked)
        return;

    /*
     * Smooth head movement.
     */

    player.yaw +=
        (
            player.targetYaw -
            player.yaw
        ) *
        Math.min(
            1,
            delta * 12
        );

    player.pitch +=
        (
            player.targetPitch -
            player.pitch
        ) *
        Math.min(
            1,
            delta * 12
        );

    let forward =
        0;

    let strafe =
        0;

    if (keys["KeyW"])
        forward += 1;

    if (keys["KeyS"])
        forward -= 1;

    if (keys["KeyD"])
        strafe += 1;

    if (keys["KeyA"])
        strafe -= 1;

    const length =
        Math.hypot(
            forward,
            strafe
        );

    if (length > 0) {

        forward /=
            length;

        strafe /=
            length;

        const movement =
            player.speed *
            delta;

        const sin =
            Math.sin(
                player.yaw
            );

        const cos =
            Math.cos(
                player.yaw
            );

        /*
         * Forward = looking direction.
         */

        player.x +=
            (
                -sin * forward +
                cos * strafe
            ) *
            movement;

        player.z +=
            (
                -cos * forward -
                sin * strafe
            ) *
            movement;

        /*
         * Corridor collision.
         */

        player.x =
            Math.max(
                -4.25,
                Math.min(
                    4.25,
                    player.x
                )
            );

        /*
         * Do not walk back through
         * the starting boundary.
         */

        player.z =
            Math.min(
                3.5,
                player.z
            );

        /*
         * Footsteps.
         */

        stepTimer -=
            delta;

        if (
            stepTimer <= 0
        ) {

            footstep();

            stepTimer =
                0.48;
        }
    }
}

/* =========================================================
   CAMERA MATRIX
   ========================================================= */

function getViewMatrix() {

    const cameraTranslation =
        translation(
            -player.x,
            -player.y,
            -player.z
        );

    const pitch =
        rotationX(
            -player.pitch
        );

    const yaw =
        rotationY(
            -player.yaw
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
   DRAW
   ========================================================= */

function drawCube(
    object,
    view,
    projection,
    time,
    flicker,
    flashValue,
    redValue
) {

    const model =
        multiply(

            translation(
                object.x,
                object.y,
                object.z
            ),

            scale(
                object.sx,
                object.sy,
                object.sz
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
        cameraLocation,
        player.x,
        player.y,
        player.z
    );

    gl.uniform1f(
        timeLocation,
        time
    );

    gl.uniform1f(
        flickerLocation,
        flicker
    );

    gl.uniform1f(
        flashLocation,
        flashValue
    );

    gl.uniform1f(
        redLocation,
        redValue
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
        indices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}

/* =========================================================
   FIGURE
   ========================================================= */

function drawFigure(
    figure,
    view,
    projection,
    time,
    flicker,
    flashValue,
    redValue
) {

    if (!figure.active)
        return;

    /*
     * Human-shaped primitive:
     *
     * head
     * torso
     * two legs
     *
     * Kept deliberately crude.
     */

    const body = {

        x: figure.x,

        y: 1.05,

        z: figure.z,

        sx: 0.55,

        sy: 1.65,

        sz: 0.28
    };

    drawCube(
        body,
        view,
        projection,
        time,
        flicker,
        flashValue,
        redValue
    );

    const head = {

        x: figure.x,

        y: 2.05,

        z: figure.z,

        sx: 0.36,

        sy: 0.36,

        sz: 0.36
    };

    drawCube(
        head,
        view,
        projection,
        time,
        flicker,
        flashValue,
        redValue
    );

    /*
     * Sometimes the figure disappears
     * when looked at for too long.
     */

    const dx =
        player.x -
        figure.x;

    const dz =
        player.z -
        figure.z;

    const distance =
        Math.hypot(
            dx,
            dz
        );

    if (
        distance < 14 &&
        Math.random() < 0.002
    ) {

        figure.active =
            false;
    }
}

/* =========================================================
   LIGHTS
   ========================================================= */

function calculateFlicker(
    time
) {

    let result =
        1.0;

    /*
     * Global subtle instability.
     */

    result +=
        Math.sin(
            time * 19
        ) *
        0.015;

    /*
     * Occasional hard flicker.
     */

    const pulse =
        Math.sin(
            time * 47
        );

    if (
        pulse > 0.995
    ) {

        result *=
            0.15;
    }

    return Math.max(
        0.08,
        Math.min(
            1.0,
            result
        )
    );
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
            canvas.clientWidth *
            dpr
        );

    const height =
        Math.floor(
            canvas.clientHeight *
            dpr
        );

    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {

        canvas.width =
            width;

        canvas.height =
            height;
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

function render(
    currentTime
) {

    const delta =
        Math.min(
            (
                currentTime -
                previousTime
            ) / 1000,
            0.05
        );

    previousTime =
        currentTime;

    const time =
        currentTime / 1000;

    resize();

    updatePlayer(
        delta
    );

    /*
     * Anomaly timer.
     */

    eventCooldown -=
        delta;

    if (
        eventCooldown <= 0
    ) {

        triggerAnomaly();
    }

    /*
     * Effects fade.
     */

    flash =
        Math.max(
            0,
            flash -
            delta * 7
        );

    red =
        Math.max(
            0,
            red -
            delta * 0.35
        );

    /*
     * Message timeout.
     */

    if (
        messageTimer > 0
    ) {

        messageTimer -=
            delta;

        if (
            messageTimer <= 0
        ) {

            hideMessage();
        }
    }

    /*
     * Clear.
     */

    gl.clearColor(
        0.0015,
        0.0015,
        0.0015,
        1
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.enable(
        gl.DEPTH_TEST
    );

    gl.enable(
        gl.CULL_FACE
    );

    /*
     * Camera.
     *
     * Narrower FOV gives a more
     * claustrophobic feeling.
     */

    const projection =
        perspective(
            Math.PI / 2.75,
            canvas.width /
                canvas.height,
            0.08,
            120
        );

    const view =
        getViewMatrix();

    const flicker =
        calculateFlicker(
            time
        );

    /*
     * Main corridor.
     */

    for (
        const object of worldObjects
    ) {

        drawCube(
            object,
            view,
            projection,
            time,
            flicker,
            flash,
            red
        );
    }

    /*
     * Ceiling fluorescent tubes.
     */

    for (
        const light of lights
    ) {

        const distance =
            Math.abs(
                player.z -
                light.z
            );

        /*
         * Only render nearby lights.
         */

        if (
            distance > 75
        )
            continue;

        let localFlicker =
            flicker;

        if (
            light.broken
        ) {

            localFlicker =
                Math.random() >
                0.08
                    ? 1
                    : 0.05;
        }

        const tube = {

            x: 0,

            y: 3.82,

            z: light.z,

            sx: 1.4,

            sy: 0.05,

            sz: 0.35
        };

        drawCube(
            tube,
            view,
            projection,
            time,
            localFlicker,
            flash,
            red
        );
    }

    /*
     * Figures.
     */

    for (
        const figure of figures
    ) {

        drawFigure(
            figure,
            view,
            projection,
            time,
            flicker,
            flash,
            red
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
