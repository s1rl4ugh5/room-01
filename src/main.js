// ROOM_01

const canvas = document.getElementById("canvas");
const intro = document.getElementById("intro");

const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: false,
    depth: true
});

if (!gl) {
    throw new Error("WebGL is not supported.");
}


// ============================================================
// SHADERS
// ============================================================

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec2 aUV;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

varying vec2 vUV;
varying vec3 vWorldPosition;

void main() {

    vec4 worldPosition =
        uModel * vec4(aPosition, 1.0);

    vWorldPosition =
        worldPosition.xyz;

    vUV = aUV;

    gl_Position =
        uProjection *
        uView *
        worldPosition;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec3 uColor;

uniform sampler2D uTexture;
uniform float uUseTexture;

uniform vec3 uLightPosition;
uniform float uLightIntensity;
uniform float uLightRadius;

uniform float uAmbient;

uniform vec3 uCameraPosition;

uniform float uFogStart;
uniform float uFogEnd;

varying vec2 vUV;
varying vec3 vWorldPosition;

void main() {

    vec3 base = uColor;

    if (uUseTexture > 0.5) {

        vec4 tex =
            texture2D(
                uTexture,
                vUV
            );

        base *= tex.rgb;
    }

    // --------------------------------------------------------
    // Fake point light.
    // There are no normals in this intentionally simple
    // renderer, so distance-based illumination is used.
    // --------------------------------------------------------

    float distanceToLight =
        distance(
            vWorldPosition,
            uLightPosition
        );

    float attenuation =
        1.0 -
        smoothstep(
            0.0,
            uLightRadius,
            distanceToLight
        );

    float light =
        uAmbient +
        attenuation * uLightIntensity;

    base *= light;

    // --------------------------------------------------------
    // Slight gamma lift.
    // Prevents the dark procedural textures from becoming
    // completely black.
    // --------------------------------------------------------

    base =
        pow(
            max(base, vec3(0.0)),
            vec3(0.78)
        );

    // --------------------------------------------------------
    // Distance fog.
    // The corridor disappears gradually instead of ending
    // abruptly in black.
    // --------------------------------------------------------

    float distanceToCamera =
        distance(
            vWorldPosition,
            uCameraPosition
        );

    float fog =
        smoothstep(
            uFogStart,
            uFogEnd,
            distanceToCamera
        );

    vec3 fogColor =
        vec3(
            0.015,
            0.014,
            0.013
        );

    base =
        mix(
            base,
            fogColor,
            fog
        );

    gl_FragColor =
        vec4(base, 1.0);
}
`;


// ============================================================
// SHADER HELPERS
// ============================================================

function compileShader(type, source) {

    const shader =
        gl.createShader(type);

    gl.shaderSource(
        shader,
        source
    );

    gl.compileShader(shader);

    if (!gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS
    )) {

        console.error(
            gl.getShaderInfoLog(shader)
        );

        throw new Error(
            "Shader compilation failed."
        );
    }

    return shader;
}


function createProgram(
    vertexSource,
    fragmentSource
) {

    const vertexShader =
        compileShader(
            gl.VERTEX_SHADER,
            vertexSource
        );

    const fragmentShader =
        compileShader(
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
            "Program linking failed."
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


// ============================================================
// LOCATIONS
// ============================================================

const locations = {

    position:
        gl.getAttribLocation(
            program,
            "aPosition"
        ),

    uv:
        gl.getAttribLocation(
            program,
            "aUV"
        ),

    projection:
        gl.getUniformLocation(
            program,
            "uProjection"
        ),

    view:
        gl.getUniformLocation(
            program,
            "uView"
        ),

    model:
        gl.getUniformLocation(
            program,
            "uModel"
        ),

    color:
        gl.getUniformLocation(
            program,
            "uColor"
        ),

    texture:
        gl.getUniformLocation(
            program,
            "uTexture"
        ),

    useTexture:
        gl.getUniformLocation(
            program,
            "uUseTexture"
        ),

    lightPosition:
        gl.getUniformLocation(
            program,
            "uLightPosition"
        ),

    lightIntensity:
        gl.getUniformLocation(
            program,
            "uLightIntensity"
        ),

    lightRadius:
        gl.getUniformLocation(
            program,
            "uLightRadius"
        ),

    ambient:
        gl.getUniformLocation(
            program,
            "uAmbient"
        ),

    cameraPosition:
        gl.getUniformLocation(
            program,
            "uCameraPosition"
        ),

    fogStart:
        gl.getUniformLocation(
            program,
            "uFogStart"
        ),

    fogEnd:
        gl.getUniformLocation(
            program,
            "uFogEnd"
        )
};


// ============================================================
// MATH
// ============================================================

function perspective(
    fov,
    aspect,
    near,
    far
) {

    const f =
        1.0 /
        Math.tan(
            fov / 2
        );

    const nf =
        1 /
        (near - far);

    return new Float32Array([

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
        (far + near) * nf,
        -1,

        0,
        0,
        (2 * far * near) * nf,
        0
    ]);
}


function normalize(v) {

    const length =
        Math.hypot(
            v[0],
            v[1],
            v[2]
        );

    if (length === 0) {
        return [0, 0, 0];
    }

    return [
        v[0] / length,
        v[1] / length,
        v[2] / length
    ];
}


function lookAt(
    eye,
    target,
    up
) {

    const z =
        normalize([
            eye[0] - target[0],
            eye[1] - target[1],
            eye[2] - target[2]
        ]);

    const x =
        normalize([
            up[1] * z[2] - up[2] * z[1],
            up[2] * z[0] - up[0] * z[2],
            up[0] * z[1] - up[1] * z[0]
        ]);

    const y = [
        z[1] * x[2] - z[2] * x[1],
        z[2] * x[0] - z[0] * x[2],
        z[0] * x[1] - z[1] * x[0]
    ];

    return new Float32Array([

        x[0],
        y[0],
        z[0],
        0,

        x[1],
        y[1],
        z[1],
        0,

        x[2],
        y[2],
        z[2],
        0,

        -(
            x[0] * eye[0] +
            x[1] * eye[1] +
            x[2] * eye[2]
        ),

        -(
            y[0] * eye[0] +
            y[1] * eye[1] +
            y[2] * eye[2]
        ),

        -(
            z[0] * eye[0] +
            z[1] * eye[1] +
            z[2] * eye[2]
        ),

        1
    ]);
}


function translation(
    x,
    y,
    z
) {

    return new Float32Array([

        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,

        x, y, z, 1
    ]);
}


function scale(
    x,
    y,
    z
) {

    return new Float32Array([

        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,

        0, 0, 0, 1
    ]);
}


function multiply(
    a,
    b
) {

    const out =
        new Float32Array(16);

    for (let row = 0; row < 4; row++) {

        for (let col = 0; col < 4; col++) {

            out[
                col * 4 + row
            ] =

                a[0 * 4 + row] *
                b[col * 4 + 0] +

                a[1 * 4 + row] *
                b[col * 4 + 1] +

                a[2 * 4 + row] *
                b[col * 4 + 2] +

                a[3 * 4 + row] *
                b[col * 4 + 3];
        }
    }

    return out;
}


// ============================================================
// CUBE
// ============================================================

const cubeVertices = new Float32Array([

    // FRONT
    -0.5, -0.5,  0.5,  0, 0,
     0.5, -0.5,  0.5,  1, 0,
     0.5,  0.5,  0.5,  1, 1,
    -0.5,  0.5,  0.5,  0, 1,

    // BACK
     0.5, -0.5, -0.5,  0, 0,
    -0.5, -0.5, -0.5,  1, 0,
    -0.5,  0.5, -0.5,  1, 1,
     0.5,  0.5, -0.5,  0, 1,

    // LEFT
    -0.5, -0.5, -0.5,  0, 0,
    -0.5, -0.5,  0.5,  1, 0,
    -0.5,  0.5,  0.5,  1, 1,
    -0.5,  0.5, -0.5,  0, 1,

    // RIGHT
     0.5, -0.5,  0.5,  0, 0,
     0.5, -0.5, -0.5,  1, 0,
     0.5,  0.5, -0.5,  1, 1,
     0.5,  0.5,  0.5,  0, 1,

    // TOP
    -0.5,  0.5,  0.5,  0, 0,
     0.5,  0.5,  0.5,  1, 0,
     0.5,  0.5, -0.5,  1, 1,
    -0.5,  0.5, -0.5,  0, 1,

    // BOTTOM
    -0.5, -0.5, -0.5,  0, 0,
     0.5, -0.5, -0.5,  1, 0,
     0.5, -0.5,  0.5,  1, 1,
    -0.5, -0.5,  0.5,  0, 1
]);


const cubeIndices = new Uint16Array([

     0,  1,  2,
     0,  2,  3,

     4,  5,  6,
     4,  6,  7,

     8,  9, 10,
     8, 10, 11,

    12, 13, 14,
    12, 14, 15,

    16, 17, 18,
    16, 18, 19,

    20, 21, 22,
    20, 22, 23
]);


const vertexBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    vertexBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    cubeVertices,
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
    cubeIndices,
    gl.STATIC_DRAW
);


gl.enableVertexAttribArray(
    locations.position
);

gl.enableVertexAttribArray(
    locations.uv
);

gl.vertexAttribPointer(
    locations.position,
    3,
    gl.FLOAT,
    false,
    20,
    0
);

gl.vertexAttribPointer(
    locations.uv,
    2,
    gl.FLOAT,
    false,
    20,
    12
);


// ============================================================
// PROCEDURAL TEXTURES
// ============================================================

const textures = {};


function makeTexture(
    type
) {

    const size = 512;

    const canvasTexture =
        document.createElement("canvas");

    canvasTexture.width = size;
    canvasTexture.height = size;

    const ctx =
        canvasTexture.getContext("2d");

    // Base
    ctx.fillStyle =
        "#45413d";

    ctx.fillRect(
        0,
        0,
        size,
        size
    );


    // --------------------------------------------------------
    // NORMAL
    // --------------------------------------------------------

    if (type === "normal") {

        for (let i = 0; i < 3000; i++) {

            const x =
                Math.random() * size;

            const y =
                Math.random() * size;

            const v =
                45 +
                Math.random() * 35;

            ctx.fillStyle =
                `rgb(${v},${v - 2},${v - 5})`;

            ctx.fillRect(
                x,
                y,
                1 + Math.random() * 3,
                1 + Math.random() * 3
            );
        }

        ctx.strokeStyle =
            "rgba(10,10,10,.25)";

        for (let y = 0; y < size; y += 64) {

            ctx.beginPath();

            ctx.moveTo(
                0,
                y
            );

            ctx.lineTo(
                size,
                y
            );

            ctx.stroke();
        }
    }


    // --------------------------------------------------------
    // WRITING
    // --------------------------------------------------------

    if (type === "writing") {

        ctx.fillStyle =
            "#403a36";

        ctx.fillRect(
            0,
            0,
            size,
            size
        );

        ctx.font =
            "bold 31px Courier New";

        ctx.fillStyle =
            "rgba(105,38,32,.8)";

        const phrases = [

            "I SAW YOU",
            "DO NOT LOOK",
            "NOT THIS WAY",
            "IT MOVED",
            "STAY",
            "BEHIND YOU",
            "LOOK AGAIN",
            "I REMEMBER",
            "NO",
            "STOP",
            "YOU WERE HERE",
            "WHY DID YOU TURN"
        ];

        for (let i = 0; i < 18; i++) {

            const phrase =
                phrases[
                    Math.floor(
                        Math.random() *
                        phrases.length
                    )
                ];

            ctx.save();

            ctx.translate(
                Math.random() * size,
                Math.random() * size
            );

            ctx.rotate(
                (Math.random() - 0.5) *
                0.35
            );

            ctx.fillText(
                phrase,
                0,
                0
            );

            ctx.restore();
        }

        for (let i = 0; i < 1200; i++) {

            ctx.fillStyle =
                "rgba(15,10,10,.25)";

            ctx.fillRect(
                Math.random() * size,
                Math.random() * size,
                Math.random() * 4,
                Math.random() * 4
            );
        }
    }


    // --------------------------------------------------------
    // FACE
    // --------------------------------------------------------

    if (type === "face") {

        ctx.fillStyle =
            "#373331";

        ctx.fillRect(
            0,
            0,
            size,
            size
        );

        const cx = 256;
        const cy = 260;

        ctx.fillStyle =
            "rgba(12,10,10,.9)";

        ctx.beginPath();

        ctx.ellipse(
            cx,
            cy,
            135,
            175,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // eyes

        ctx.fillStyle =
            "#070707";

        ctx.beginPath();

        ctx.ellipse(
            cx - 55,
            cy - 35,
            26,
            12,
            0,
            0,
            Math.PI * 2
        );

        ctx.ellipse(
            cx + 55,
            cy - 35,
            26,
            12,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // mouth

        ctx.beginPath();

        ctx.ellipse(
            cx,
            cy + 65,
            58,
            22,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // vertical corruption

        for (let i = 0; i < 90; i++) {

            ctx.fillStyle =
                `rgba(0,0,0,${
                    Math.random() * .35
                })`;

            ctx.fillRect(
                Math.random() * size,
                0,
                1 + Math.random() * 8,
                size
            );
        }
    }


    // --------------------------------------------------------
    // ORGANIC
    // --------------------------------------------------------

    if (type === "organic") {

        ctx.fillStyle =
            "#382f2d";

        ctx.fillRect(
            0,
            0,
            size,
            size
        );

        ctx.strokeStyle =
            "rgba(96,28,26,.85)";

        ctx.lineWidth = 5;

        for (let i = 0; i < 25; i++) {

            ctx.beginPath();

            let x =
                Math.random() * size;

            let y = 0;

            ctx.moveTo(
                x,
                y
            );

            for (
                let j = 0;
                j < 8;
                j++
            ) {

                x +=
                    (Math.random() - .5) *
                    100;

                y +=
                    40 +
                    Math.random() * 80;

                ctx.lineTo(
                    x,
                    y
                );
            }

            ctx.stroke();
        }

        for (let i = 0; i < 500; i++) {

            ctx.fillStyle =
                "rgba(80,20,18,.35)";

            ctx.beginPath();

            ctx.arc(
                Math.random() * size,
                Math.random() * size,
                Math.random() * 8,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    // --------------------------------------------------------
    // CORRUPT
    // --------------------------------------------------------

    if (type === "corrupt") {

        ctx.fillStyle =
            "#282523";

        ctx.fillRect(
            0,
            0,
            size,
            size
        );

        for (let i = 0; i < 100; i++) {

            ctx.fillStyle =
                Math.random() > .75
                    ? "rgba(100,20,20,.8)"
                    : "rgba(0,0,0,.7)";

            ctx.fillRect(

                Math.random() * size,

                Math.random() * size,

                20 +
                Math.random() * 180,

                3 +
                Math.random() * 30
            );
        }
    }


    const texture =
        gl.createTexture();

    gl.bindTexture(
        gl.TEXTURE_2D,
        texture
    );

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvasTexture
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR
    );

    gl.generateMipmap(
        gl.TEXTURE_2D
    );

    return texture;
}


textures.normal =
    makeTexture("normal");

textures.writing =
    makeTexture("writing");

textures.face =
    makeTexture("face");

textures.organic =
    makeTexture("organic");

textures.corrupt =
    makeTexture("corrupt");


// ============================================================
// WORLD
// ============================================================

const SEGMENT_LENGTH = 7;
const CORRIDOR_WIDTH = 5;
const WALL_HEIGHT = 4;

const world = {

    seed:
        Math.random() * 100000,

    intensity: 0,

    visited:
        new Map(),

    generated:
        new Map(),

    presences: [],

    totalDistance: 0,

    stoppedTime: 0,

    lookingBack: 0,

    backwardsTravel: 0,

    lastSegment: null,

    lastZ: 0,

    lastYaw: 0,

    mutationCounter: 0
};


function seededRandom(
    seed
) {

    const x =
        Math.sin(seed * 12.9898) *
        43758.5453;

    return (
        x -
        Math.floor(x)
    );
}


function getSegment(
    index
) {

    if (
        world.generated.has(index)
    ) {

        return world.generated.get(
            index
        );
    }

    const r =
        seededRandom(
            world.seed +
            index * 137.17
        );

    let texture =
        "normal";

    let chance =
        r;

    if (
        world.intensity > .25 &&
        chance < .16
    ) {

        texture =
            "writing";
    }

    if (
        world.intensity > .45 &&
        chance < .08
    ) {

        texture =
            "face";
    }

    if (
        world.intensity > .60 &&
        chance < .055
    ) {

        texture =
            "organic";
    }

    if (
        world.intensity > .80 &&
        chance < .035
    ) {

        texture =
            "corrupt";
    }


    const segment = {

        index,

        texture,

        mutated: false,

        visited: 0,

        lightFailure:
            seededRandom(
                world.seed +
                index * 31.7
            ) < .08,

        lightOffset:
            seededRandom(
                world.seed +
                index * 91.1
            ),

        ceilingHeight:
            3.7 +
            seededRandom(
                world.seed +
                index * 5.3
            ) * .4
    };

    world.generated.set(
        index,
        segment
    );

    return segment;
}


// ============================================================
// PLAYER
// ============================================================

const player = {

    x: 0,

    y: 1.68,

    z: 0,

    yaw: Math.PI,

    pitch: 0,

    speed: 2.65,

    radius: .42
};


const keys = {};


window.addEventListener(
    "keydown",
    event => {

        keys[
            event.key.toLowerCase()
        ] = true;

        if (
            event.key.toLowerCase() === "r"
        ) {

            location.reload();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[
            event.key.toLowerCase()
        ] = false;
    }
);


// ============================================================
// MOUSE LOOK
// ============================================================

canvas.addEventListener(
    "click",
    () => {

        if (
            document.pointerLockElement !== canvas
        ) {

            canvas.requestPointerLock();
        }
    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !== canvas
        ) {
            return;
        }

        player.yaw -=
            event.movementX *
            0.0022;

        player.pitch -=
            event.movementY *
            0.0022;

        // Do not allow the camera to become
        // an aircraft/free-flight camera.

        player.pitch =
            Math.max(
                -0.82,
                Math.min(
                    0.82,
                    player.pitch
                )
            );
    }
);


// ============================================================
// AUDIO
// ============================================================

let audioContext = null;
let drone = null;
let droneGain = null;


function startAudio() {

    if (audioContext) {
        return;
    }

    audioContext =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    drone =
        audioContext.createOscillator();

    droneGain =
        audioContext.createGain();

    drone.type =
        "sine";

    drone.frequency.value =
        43;

    droneGain.gain.value =
        0.018;

    drone.connect(
        droneGain
    );

    droneGain.connect(
        audioContext.destination
    );

    drone.start();
}


function playTone(
    frequency,
    duration,
    volume
) {

    if (!audioContext) {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type =
        "sine";

    oscillator.frequency.value =
        frequency;

    gain.gain.value =
        volume;

    oscillator.connect(
        gain
    );

    gain.connect(
        audioContext.destination
    );

    const now =
        audioContext.currentTime;

    gain.gain.setValueAtTime(
        volume,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
    );

    oscillator.start(now);

    oscillator.stop(
        now + duration
    );
}


// ============================================================
// PRESENCES
// ============================================================

function spawnPresence(
    x,
    z,
    mode = "far"
) {

    if (
        world.presences.length >= 5
    ) {
        return;
    }

    world.presences.push({

        x,

        y: 0,

        z,

        mode,

        age: 0,

        visibleTime: 0,

        speed:
            mode === "approach"
                ? 0.12
                : 0
    });
}


function maybeSpawnPresence(
    segment
) {

    const intensity =
        world.intensity;

    if (
        intensity < .25
    ) {
        return;
    }

    const distance =
        Math.abs(
            segment.index *
            SEGMENT_LENGTH -
            player.z
        );

    if (
        distance < 10
    ) {
        return;
    }

    let probability =
        0.002 +
        intensity *
        0.004;

    if (
        world.stoppedTime > 8
    ) {

        probability +=
            0.018;
    }

    if (
        world.lookingBack > 1.3
    ) {

        probability +=
            0.025;
    }

    if (
        Math.random() <
        probability
    ) {

        const direction =
            player.z >
            segment.index *
            SEGMENT_LENGTH
                ? 1
                : -1;

        spawnPresence(

            player.x,

            segment.index *
                SEGMENT_LENGTH +
                direction *
                4,

            intensity > .7
                ? "approach"
                : "far"
        );

        playTone(
            61 +
            Math.random() * 20,
            1.4,
            .025
        );
    }
}


function maybeSpawnBehind() {

    if (
        world.intensity < .35
    ) {
        return;
    }

    if (
        world.presences.length >= 5
    ) {
        return;
    }

    if (
        Math.random() >
        0.025 +
        world.intensity * 0.035
    ) {
        return;
    }

    const forward = {

        x:
            -Math.sin(player.yaw),

        z:
            -Math.cos(player.yaw)
    };

    spawnPresence(

        player.x -
        forward.x * 8,

        player.z -
        forward.z * 8,

        "far"
    );

    playTone(
        49,
        1.8,
        .018
    );
}


// ============================================================
// MOVEMENT
// ============================================================

function updatePlayer(
    dt
) {

    let forward = 0;
    let strafe = 0;

    if (keys["w"]) {
        forward += 1;
    }

    if (keys["s"]) {
        forward -= 1;
    }

    if (keys["a"]) {
        strafe -= 1;
    }

    if (keys["d"]) {
        strafe += 1;
    }

    const moving =
        forward !== 0 ||
        strafe !== 0;

    if (moving) {

        const length =
            Math.hypot(
                forward,
                strafe
            );

        forward /= length;
        strafe /= length;

        const forwardX =
            -Math.sin(player.yaw);

        const forwardZ =
            -Math.cos(player.yaw);

        const rightX =
            Math.cos(player.yaw);

        const rightZ =
            -Math.sin(player.yaw);

        const movementX =
            (
                forwardX *
                forward +

                rightX *
                strafe
            ) *
            player.speed *
            dt;

        const movementZ =
            (
                forwardZ *
                forward +

                rightZ *
                strafe
            ) *
            player.speed *
            dt;

        player.x += movementX;

        player.z += movementZ;

        // Corridor walls.
        player.x =
            Math.max(
                -CORRIDOR_WIDTH / 2 +
                player.radius,

                Math.min(
                    CORRIDOR_WIDTH / 2 -
                    player.radius,

                    player.x
                )
            );

        world.totalDistance +=
            Math.hypot(
                movementX,
                movementZ
            );

        world.stoppedTime = 0;

    } else {

        world.stoppedTime +=
            dt;
    }


    // --------------------------------------------------------
    // Looking backwards
    // --------------------------------------------------------

    let yawDelta =
        Math.abs(
            player.yaw -
            world.lastYaw
        );

    if (yawDelta > Math.PI) {
        yawDelta =
            Math.PI * 2 -
            yawDelta;
    }

    if (
        Math.abs(
            player.yaw -
            world.lastYaw
        ) > 0.7
    ) {

        world.lookingBack +=
            dt;
    } else {

        world.lookingBack *=
            0.94;
    }

    world.lastYaw =
        player.yaw;


    // --------------------------------------------------------
    // World intensity is based on exploration.
    // No clock-based progression.
    // --------------------------------------------------------

    world.intensity =
        Math.min(
            1,
            world.totalDistance /
            170
        );


    if (
        player.z <
        world.lastZ - 0.01
    ) {

        world.backwardsTravel +=
            dt;

    } else {

        world.backwardsTravel *=
            0.96;
    }

    world.lastZ =
        player.z;
}


// ============================================================
// SEGMENT STATE
// ============================================================

function updateWorld() {

    const segmentIndex =
        Math.floor(
            player.z /
            SEGMENT_LENGTH
        );

    const segment =
        getSegment(
            segmentIndex
        );

    if (
        world.lastSegment !==
        segmentIndex
    ) {

        world.lastSegment =
            segmentIndex;

        segment.visited++;

        if (
            segment.visited > 1
        ) {

            mutateSegment(
                segment
            );
        }

        world.visited.set(
            segmentIndex,
            segment.visited
        );
    }

    maybeSpawnPresence(
        segment
    );

    if (
        world.lookingBack > 1.3
    ) {

        maybeSpawnBehind();
    }
}


function mutateSegment(
    segment
) {

    if (
        segment.mutated
    ) {
        return;
    }

    segment.mutated = true;

    const roll =
        Math.random();

    if (
        world.intensity > .3 &&
        roll < .45
    ) {

        segment.texture =
            "writing";
    }

    if (
        world.intensity > .55 &&
        roll < .25
    ) {

        segment.texture =
            "face";
    }

    if (
        world.intensity > .7 &&
        roll < .16
    ) {

        segment.texture =
            "organic";
    }

    if (
        world.intensity > .85 &&
        roll < .08
    ) {

        segment.texture =
            "corrupt";
    }

    world.mutationCounter++;

    playTone(
        35 +
        Math.random() * 15,
        2.5,
        .012
    );
}


// ============================================================
// DRAW HELPERS
// ============================================================

function drawCube({
    x,
    y,
    z,
    sx,
    sy,
    sz,
    color,
    texture = null
}) {

    const model =
        multiply(
            translation(
                x,
                y,
                z
            ),
            scale(
                sx,
                sy,
                sz
            )
        );

    gl.uniformMatrix4fv(
        locations.model,
        false,
        model
    );

    gl.uniform3fv(
        locations.color,
        color
    );

    if (texture) {

        gl.activeTexture(
            gl.TEXTURE0
        );

        gl.bindTexture(
            gl.TEXTURE_2D,
            texture
        );

        gl.uniform1i(
            locations.texture,
            0
        );

        gl.uniform1f(
            locations.useTexture,
            1
        );

    } else {

        gl.uniform1f(
            locations.useTexture,
            0
        );
    }

    gl.drawElements(
        gl.TRIANGLES,
        cubeIndices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}


// ============================================================
// CORRIDOR
// ============================================================

function drawSegment(
    segment
) {

    const z =
        segment.index *
        SEGMENT_LENGTH;

    const wallTexture =
        textures[
            segment.texture
        ] ||
        textures.normal;


    // --------------------------------------------------------
    // Floor
    // --------------------------------------------------------

    drawCube({

        x: 0,

        y: -0.05,

        z:
            z +
            SEGMENT_LENGTH / 2,

        sx:
            CORRIDOR_WIDTH,

        sy:
            0.1,

        sz:
            SEGMENT_LENGTH,

        color: [
            0.42,
            0.40,
            0.37
        ],

        texture:
            textures.normal
    });


    // --------------------------------------------------------
    // Ceiling
    // --------------------------------------------------------

    drawCube({

        x: 0,

        y:
            segment.ceilingHeight,

        z:
            z +
            SEGMENT_LENGTH / 2,

        sx:
            CORRIDOR_WIDTH,

        sy:
            0.12,

        sz:
            SEGMENT_LENGTH,

        color: [
            0.30,
            0.29,
            0.27
        ],

        texture:
            textures.normal
    });


    // --------------------------------------------------------
    // Left wall
    // --------------------------------------------------------

    drawCube({

        x:
            -CORRIDOR_WIDTH / 2,

        y:
            segment.ceilingHeight / 2,

        z:
            z +
            SEGMENT_LENGTH / 2,

        sx:
            0.12,

        sy:
            segment.ceilingHeight,

        sz:
            SEGMENT_LENGTH,

        color: [
            0.48,
            0.46,
            0.43
        ],

        texture:
            wallTexture
    });


    // --------------------------------------------------------
    // Right wall
    // --------------------------------------------------------

    drawCube({

        x:
            CORRIDOR_WIDTH / 2,

        y:
            segment.ceilingHeight / 2,

        z:
            z +
            SEGMENT_LENGTH / 2,

        sx:
            0.12,

        sy:
            segment.ceilingHeight,

        sz:
            SEGMENT_LENGTH,

        color: [
            0.48,
            0.46,
            0.43
        ],

        texture:
            wallTexture
    });


    // --------------------------------------------------------
    // Ceiling light
    // --------------------------------------------------------

    if (
        !segment.lightFailure
    ) {

        drawCube({

            x: 0,

            y:
                segment.ceilingHeight -
                0.08,

            z:
                z +
                SEGMENT_LENGTH / 2,

            sx:
                1.2,

            sy:
                0.035,

            sz:
                0.22,

            color: [
                1.0,
                0.92,
                0.78
            ]
        });
    }
}


// ============================================================
// PRESENCE DRAWING
// ============================================================

function drawPresence(
    presence
) {

    const x =
        presence.x;

    const z =
        presence.z;

    const bodyColor = [
        0.055,
        0.052,
        0.05
    ];


    // torso

    drawCube({

        x,

        y: 1.15,

        z,

        sx: 0.48,

        sy: 1.65,

        sz: 0.30,

        color:
            bodyColor
    });


    // head

    drawCube({

        x,

        y: 2.18,

        z,

        sx: 0.34,

        sy: 0.42,

        sz: 0.34,

        color:
            bodyColor
    });


    // legs

    drawCube({

        x:
            x - 0.13,

        y:
            0.35,

        z,

        sx:
            0.14,

        sy:
            0.7,

        sz:
            0.16,

        color:
            bodyColor
    });


    drawCube({

        x:
            x + 0.13,

        y:
            0.35,

        z,

        sx:
            0.14,

        sy:
            0.7,

        sz:
            0.16,

        color:
            bodyColor
    });
}


function updatePresences(
    dt
) {

    for (
        let i =
            world.presences.length - 1;

        i >= 0;

        i--
    ) {

        const p =
            world.presences[i];

        p.age += dt;


        // A presence can remain still for a long time.

        if (
            p.mode === "approach" &&
            world.intensity > .72
        ) {

            const dx =
                player.x - p.x;

            const dz =
                player.z - p.z;

            const distance =
                Math.hypot(
                    dx,
                    dz
                );

            if (
                distance > 2.5
            ) {

                p.x +=
                    (dx / distance) *
                    p.speed *
                    dt;

                p.z +=
                    (dz / distance) *
                    p.speed *
                    dt;
            }
        }


        const distance =
            Math.hypot(
                player.x - p.x,
                player.z - p.z
            );

        p.visibleTime +=
            dt;


        // Sometimes a presence is simply gone
        // when the player gets close.

        if (
            distance < 2.2 &&
            p.age > 3
        ) {

            if (
                Math.random() <
                0.012
            ) {

                world.presences.splice(
                    i,
                    1
                );

                playTone(
                    28,
                    1.2,
                    .018
                );
            }
        }


        // Very old presences disappear eventually,
        // preventing unlimited accumulation.

        if (
            p.age > 90
        ) {

            world.presences.splice(
                i,
                1
            );
        }
    }
}


// ============================================================
// RENDER
// ============================================================

function resize() {

    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    canvas.width =
        Math.floor(
            window.innerWidth *
            dpr
        );

    canvas.height =
        Math.floor(
            window.innerHeight *
            dpr
        );

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

resize();


function render() {

    gl.clearColor(
        0.005,
        0.005,
        0.004,
        1
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.enable(
        gl.DEPTH_TEST
    );


    // --------------------------------------------------------
    // Projection
    // --------------------------------------------------------

    const aspect =
        canvas.width /
        canvas.height;

    const projection =
        perspective(

            70 *
            Math.PI /
            180,

            aspect,

            0.05,

            180
        );

    gl.uniformMatrix4fv(
        locations.projection,
        false,
        projection
    );


    // --------------------------------------------------------
    // Camera
    // --------------------------------------------------------

    const lookDistance =
        1;

    const direction = {

        x:
            -Math.sin(
                player.yaw
            ) *
            Math.cos(
                player.pitch
            ),

        y:
            Math.sin(
                player.pitch
            ),

        z:
            -Math.cos(
                player.yaw
            ) *
            Math.cos(
                player.pitch
            )
    };


    const target = [

        player.x +
        direction.x *
        lookDistance,

        player.y +
        direction.y *
        lookDistance,

        player.z +
        direction.z *
        lookDistance
    ];


    const view =
        lookAt(

            [
                player.x,
                player.y,
                player.z
            ],

            target,

            [
                0,
                1,
                0
            ]
        );


    gl.uniformMatrix4fv(
        locations.view,
        false,
        view
    );


    gl.uniform3fv(
        locations.cameraPosition,
        [
            player.x,
            player.y,
            player.z
        ]
    );


    // --------------------------------------------------------
    // Lighting
    // --------------------------------------------------------

    const currentSegment =
        Math.floor(
            player.z /
            SEGMENT_LENGTH
        );


    const lightSegment =
        getSegment(
            currentSegment
        );


    const lightZ =
        currentSegment *
        SEGMENT_LENGTH +
        SEGMENT_LENGTH / 2;


    gl.uniform3fv(
        locations.lightPosition,
        [
            0,
            lightSegment.ceilingHeight -
            0.15,
            lightZ
        ]
    );


    if (
        lightSegment.lightFailure
    ) {

        gl.uniform1f(
            locations.lightIntensity,
            0.15
        );

    } else {

        gl.uniform1f(
            locations.lightIntensity,
            0.95
        );
    }


    gl.uniform1f(
        locations.lightRadius,
        9.5
    );


    // This is deliberately non-zero.
    // It is what keeps the corridor visible
    // when the fluorescent light is far away.

    gl.uniform1f(
        locations.ambient,
        0.22
    );


    gl.uniform1f(
        locations.fogStart,
        22
    );

    gl.uniform1f(
        locations.fogEnd,
        55
    );


    // --------------------------------------------------------
    // Draw nearby corridor.
    // --------------------------------------------------------

    const center =
        currentSegment;


    for (
        let i = center - 5;
        i <= center + 7;
        i++
    ) {

        drawSegment(
            getSegment(i)
        );
    }


    // --------------------------------------------------------
    // Presences
    // --------------------------------------------------------

    for (
        const presence of
        world.presences
    ) {

        drawPresence(
            presence
        );
    }
}


// ============================================================
// MAIN LOOP
// ============================================================

let lastTime =
    performance.now();


function loop(
    now
) {

    const dt =
        Math.min(
            (now - lastTime) /
            1000,
            0.05
        );

    lastTime =
        now;

    if (
        started
    ) {

        updatePlayer(
            dt
        );

        updateWorld();

        updatePresences(
            dt
        );

        render();
    }

    requestAnimationFrame(
        loop
    );
}


let started = false;


function start() {

    if (started) {
        return;
    }

    started = true;

    startAudio();

    intro.classList.add(
        "hidden"
    );

    canvas.requestPointerLock();

    lastTime =
        performance.now();
}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            start();
        }
    }
);


intro.addEventListener(
    "click",
    start
);


requestAnimationFrame(
    loop
);
