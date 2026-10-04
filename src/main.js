/*
    ROOM_01
    ============================================================

    Experimental first-person horror environment.

    Controls:

        W / S       forward / backward
        A / D       strafe
        Mouse       look
        R           restart
        ESC         release mouse
*/


const canvas =
    document.getElementById("canvas");

const gl =
    canvas.getContext("webgl");

if (!gl) {
    throw new Error(
        "WebGL is not supported."
    );
}


/* ============================================================
   SHADERS
   ============================================================ */

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec2 aUV;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

varying vec2 vUV;

void main() {

    vUV = aUV;

    gl_Position =
        uProjection *
        uView *
        uModel *
        vec4(aPosition, 1.0);
}
`;


const fragmentShaderSource = `
precision mediump float;

uniform vec3 uColor;
uniform float uBrightness;

uniform sampler2D uTexture;
uniform float uUseTexture;

varying vec2 vUV;

void main() {

    vec3 base =
        uColor;

    if (uUseTexture > 0.5) {

        vec4 tex =
            texture2D(
                uTexture,
                vUV
            );

        base *= tex.rgb;
    }

    gl_FragColor =
        vec4(
            base * uBrightness,
            1.0
        );
}
`;


/* ============================================================
   SHADER CREATION
   ============================================================ */

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

    gl.compileShader(
        shader
    );

    if (
        !gl.getShaderParameter(
            shader,
            gl.COMPILE_STATUS
        )
    ) {

        throw new Error(
            gl.getShaderInfoLog(shader)
        );
    }

    return shader;
}


const vertexShader =
    compileShader(
        gl.VERTEX_SHADER,
        vertexShaderSource
    );


const fragmentShader =
    compileShader(
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
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

gl.linkProgram(
    program
);

if (
    !gl.getProgramParameter(
        program,
        gl.LINK_STATUS
    )
) {

    throw new Error(
        gl.getProgramInfoLog(program)
    );
}

gl.useProgram(program);


/* ============================================================
   LOCATIONS
   ============================================================ */

const positionLocation =
    gl.getAttribLocation(
        program,
        "aPosition"
    );

const uvLocation =
    gl.getAttribLocation(
        program,
        "aUV"
    );

const projectionLocation =
    gl.getUniformLocation(
        program,
        "uProjection"
    );

const viewLocation =
    gl.getUniformLocation(
        program,
        "uView"
    );

const modelLocation =
    gl.getUniformLocation(
        program,
        "uModel"
    );

const colorLocation =
    gl.getUniformLocation(
        program,
        "uColor"
    );

const brightnessLocation =
    gl.getUniformLocation(
        program,
        "uBrightness"
    );

const textureLocation =
    gl.getUniformLocation(
        program,
        "uTexture"
    );

const useTextureLocation =
    gl.getUniformLocation(
        program,
        "uUseTexture"
    );


/* ============================================================
   MATH
   ============================================================ */

function identity() {

    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function multiply(a, b) {

    const out =
        new Float32Array(16);

    for (
        let column = 0;
        column < 4;
        column++
    ) {

        for (
            let row = 0;
            row < 4;
            row++
        ) {

            out[
                column * 4 + row
            ] =
                a[row] *
                b[column * 4] +

                a[4 + row] *
                b[column * 4 + 1] +

                a[8 + row] *
                b[column * 4 + 2] +

                a[12 + row] *
                b[column * 4 + 3];
        }
    }

    return out;
}


function translation(
    x,
    y,
    z
) {

    const m =
        identity();

    m[12] = x;
    m[13] = y;
    m[14] = z;

    return m;
}


function scale(
    x,
    y,
    z
) {

    const m =
        identity();

    m[0] = x;
    m[5] = y;
    m[10] = z;

    return m;
}


function rotationY(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}


function rotationX(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
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


/* ============================================================
   CUBE GEOMETRY
   ============================================================ */

const cubePositions =
    new Float32Array([

        // front
        -0.5, -0.5, 0.5,
         0.5, -0.5, 0.5,
         0.5,  0.5, 0.5,

        -0.5, -0.5, 0.5,
         0.5,  0.5, 0.5,
        -0.5,  0.5, 0.5,

        // back
         0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,

         0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,

        // left
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,

        -0.5, -0.5, -0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,

        // right
         0.5, -0.5,  0.5,
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,

         0.5, -0.5,  0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,

        // top
        -0.5, 0.5, 0.5,
         0.5, 0.5, 0.5,
         0.5, 0.5, -0.5,

        -0.5, 0.5, 0.5,
         0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5,

        // bottom
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5, 0.5,

        -0.5, -0.5, -0.5,
         0.5, -0.5, 0.5,
        -0.5, -0.5, 0.5
    ]);


const cubeUV =
    new Float32Array([

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,

        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1
    ]);


const positionBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    positionBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    cubePositions,
    gl.STATIC_DRAW
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


const uvBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    uvBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    cubeUV,
    gl.STATIC_DRAW
);

gl.enableVertexAttribArray(
    uvLocation
);

gl.vertexAttribPointer(
    uvLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
);


/* ============================================================
   PROCEDURAL TEXTURES
   ============================================================ */

function createTextureCanvas(
    type,
    seed
) {

    const size = 256;

    const c =
        document.createElement(
            "canvas"
        );

    c.width = size;
    c.height = size;

    const ctx =
        c.getContext("2d");

    /*
        Base wall.
    */

    ctx.fillStyle =
        "#151513";

    ctx.fillRect(
        0,
        0,
        size,
        size
    );


    /*
        Noise.
    */

    for (
        let i = 0;
        i < 16000;
        i++
    ) {

        const x =
            Math.random() *
            size;

        const y =
            Math.random() *
            size;

        const v =
            Math.floor(
                20 +
                Math.random() * 35
            );

        ctx.fillStyle =
            `rgb(${v},${v},${v - 2})`;

        ctx.fillRect(
            x,
            y,
            1,
            1
        );
    }


    /*
        Normal wall.
    */

    if (
        type === "normal"
    ) {

        ctx.strokeStyle =
            "#242420";

        for (
            let y = 0;
            y < size;
            y += 64
        ) {

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


    /*
        Writing physically painted on the wall.
    */

    if (
        type === "writing"
    ) {

        ctx.strokeStyle =
            "#681f1f";

        ctx.fillStyle =
            "#702020";

        ctx.font =
            "bold 27px Courier New";

        const words = [
            "I SAW YOU",
            "NOT THIS WAY",
            "DO NOT",
            "IT MOVED",
            "STAY",
            "BEHIND YOU",
            "LOOK AGAIN"
        ];

        const word =
            words[
                seed %
                words.length
            ];

        ctx.save();

        ctx.translate(
            128,
            128
        );

        ctx.rotate(
            -0.04 +
            Math.sin(seed) *
            0.02
        );

        ctx.fillText(
            word,
            -95,
            0
        );

        ctx.restore();


        for (
            let i = 0;
            i < 15;
            i++
        ) {

            ctx.beginPath();

            ctx.moveTo(
                Math.random() * 256,
                Math.random() * 256
            );

            ctx.lineTo(
                Math.random() * 256,
                Math.random() * 256
            );

            ctx.stroke();
        }
    }


    /*
        Face-like image.
        It is deliberately ambiguous rather than a
        conventional monster.
    */

    if (
        type === "face"
    ) {

        const cx = 128;
        const cy = 128;

        ctx.fillStyle =
            "#292421";

        ctx.beginPath();

        ctx.ellipse(
            cx,
            cy,
            72,
            92,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#050505";

        ctx.beginPath();

        ctx.ellipse(
            98,
            115,
            17,
            25,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.ellipse(
            158,
            115,
            17,
            25,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /*
            Mouth.
        */

        ctx.fillStyle =
            "#090707";

        ctx.beginPath();

        ctx.ellipse(
            128,
            176,
            44,
            17,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /*
            Vertical distortions.
        */

        ctx.strokeStyle =
            "#471414";

        ctx.lineWidth = 4;

        for (
            let i = 0;
            i < 8;
            i++
        ) {

            const x =
                75 +
                i * 15;

            ctx.beginPath();

            ctx.moveTo(
                x,
                165
            );

            ctx.lineTo(
                x +
                Math.sin(i * seed) *
                10,
                225
            );

            ctx.stroke();
        }
    }


    /*
        Anatomical / organic wall.
    */

    if (
        type === "organic"
    ) {

        ctx.fillStyle =
            "#391313";

        for (
            let i = 0;
            i < 28;
            i++
        ) {

            const x =
                Math.random() *
                256;

            const y =
                Math.random() *
                256;

            const r =
                4 +
                Math.random() *
                24;

            ctx.beginPath();

            ctx.ellipse(
                x,
                y,
                r,
                r *
                (
                    0.5 +
                    Math.random()
                ),
                Math.random(),
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        ctx.strokeStyle =
            "#551616";

        ctx.lineWidth = 3;

        for (
            let i = 0;
            i < 16;
            i++
        ) {

            ctx.beginPath();

            ctx.moveTo(
                Math.random() * 256,
                0
            );

            ctx.bezierCurveTo(
                Math.random() * 256,
                80,
                Math.random() * 256,
                170,
                Math.random() * 256,
                256
            );

            ctx.stroke();
        }
    }


    /*
        Extremely degraded image.
    */

    if (
        type === "corrupt"
    ) {

        for (
            let i = 0;
            i < 80;
            i++
        ) {

            const x =
                Math.random() * 256;

            const y =
                Math.random() * 256;

            const w =
                2 +
                Math.random() * 80;

            const h =
                2 +
                Math.random() * 15;

            ctx.fillStyle =
                Math.random() > 0.5
                    ? "#050505"
                    : "#481515";

            ctx.fillRect(
                x,
                y,
                w,
                h
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
        c
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR
    );

    gl.bindTexture(
        gl.TEXTURE_2D,
        null
    );

    return texture;
}


const textures = {

    normal:
        createTextureCanvas(
            "normal",
            1
        ),

    writing:
        createTextureCanvas(
            "writing",
            17
        ),

    face:
        createTextureCanvas(
            "face",
            31
        ),

    organic:
        createTextureCanvas(
            "organic",
            47
        ),

    corrupt:
        createTextureCanvas(
            "corrupt",
            71
        )
};


/* ============================================================
   DRAW
   ============================================================ */

function drawCube(
    x,
    y,
    z,
    sx,
    sy,
    sz,
    color,
    brightness = 1,
    rotation = 0,
    texture = null
) {

    let model =
        translation(
            x,
            y,
            z
        );

    model =
        multiply(
            model,
            rotationY(rotation)
        );

    model =
        multiply(
            model,
            scale(
                sx,
                sy,
                sz
            )
        );

    gl.uniformMatrix4fv(
        modelLocation,
        false,
        model
    );

    gl.uniform3fv(
        colorLocation,
        color
    );

    gl.uniform1f(
        brightnessLocation,
        brightness
    );

    gl.uniform1f(
        useTextureLocation,
        texture ? 1 : 0
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
            textureLocation,
            0
        );
    }

    gl.drawArrays(
        gl.TRIANGLES,
        0,
        36
    );

    if (texture) {

        gl.bindTexture(
            gl.TEXTURE_2D,
            null
        );
    }
}


/* ============================================================
   WORLD
   ============================================================ */

const SEGMENT_LENGTH = 7;
const WALL_HEIGHT = 4;
const CORRIDOR_WIDTH = 5;

const world = {

    seed:
        Math.random() * 100000,

    intensity: 0,

    visited:
        new Map(),

    generated:
        new Map(),

    presences: [],

    lastSegment:
        -1,

    backwardsTravel:
        0,

    totalDistance:
        0,

    stoppedTime:
        0,

    lookingBack:
        0,

    lastLookYaw:
        0,

    lastPlayerZ:
        0,

    lastDirection:
        -1,

    mutationCounter:
        0
};


/* ============================================================
   PLAYER
   ============================================================ */

const player = {

    x: 0,

    y: 1.68,

    z: 0,

    yaw: 0,

    pitch: 0,

    targetYaw: 0,

    targetPitch: 0,

    walkSpeed: 3.0,

    bob: 0,

    moving: false
};


const keys = {};


window.addEventListener(
    "keydown",
    event => {

        keys[
            event.code
        ] = true;

        if (
            event.code === "KeyR"
        ) {

            location.reload();
        }

        if (
            event.code === "Enter"
        ) {

            startGame();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[
            event.code
        ] = false;
    }
);


/* ============================================================
   CAMERA
   ============================================================ */

canvas.addEventListener(
    "click",
    () => {

        startGame();

        canvas.requestPointerLock();
    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !==
            canvas
        ) {

            return;
        }

        player.targetYaw -=
            event.movementX *
            0.0019;

        player.targetPitch -=
            event.movementY *
            0.00125;

        /*
            This is a walking camera.

            Pitch is deliberately limited.
            The player cannot tilt the world over.
        */

        player.targetPitch =
            Math.max(
                -0.95,
                Math.min(
                    0.95,
                    player.targetPitch
                )
            );
    }
);


/* ============================================================
   AUDIO
   ============================================================ */

let audio =
    null;

let master =
    null;

let drone =
    null;


function initAudio() {

    if (audio) {
        return;
    }

    audio =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    master =
        audio.createGain();

    master.gain.value =
        0.24;

    master.connect(
        audio.destination
    );


    drone =
        audio.createOscillator();

    const droneGain =
        audio.createGain();

    drone.type =
        "sine";

    drone.frequency.value =
        41;

    droneGain.gain.value =
        0.035;

    drone.connect(
        droneGain
    );

    droneGain.connect(
        master
    );

    drone.start();
}


function tone(
    frequency,
    duration,
    volume = 0.08,
    type = "sine"
) {

    if (!audio) {
        return;
    }

    const oscillator =
        audio.createOscillator();

    const gain =
        audio.createGain();

    oscillator.type =
        type;

    oscillator.frequency.value =
        frequency;

    gain.gain.setValueAtTime(
        0.0001,
        audio.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        audio.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime +
        duration
    );

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.start();

    oscillator.stop(
        audio.currentTime +
        duration
    );
}


function noise(
    duration = 0.2,
    volume = 0.08
) {

    if (!audio) {
        return;
    }

    const buffer =
        audio.createBuffer(
            1,
            audio.sampleRate *
            duration,
            audio.sampleRate
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
        audio.createBufferSource();

    const gain =
        audio.createGain();

    source.buffer =
        buffer;

    gain.gain.value =
        volume;

    source.connect(gain);
    gain.connect(master);

    source.start();
}


function footstep(
    pan = 0
) {

    if (!audio) {
        return;
    }

    const oscillator =
        audio.createOscillator();

    const gain =
        audio.createGain();

    const stereo =
        audio.createStereoPanner();

    oscillator.type =
        "triangle";

    oscillator.frequency.value =
        55 +
        Math.random() * 18;

    stereo.pan.value =
        pan;

    gain.gain.setValueAtTime(
        0.0001,
        audio.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.10,
        audio.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime + 0.17
    );

    oscillator.connect(gain);
    gain.connect(stereo);
    stereo.connect(master);

    oscillator.start();

    oscillator.stop(
        audio.currentTime + 0.18
    );
}


/* ============================================================
   GAME START
   ============================================================ */

let started = false;


function startGame() {

    if (started) {
        return;
    }

    started = true;

    initAudio();

    document
        .getElementById("intro")
        .classList.add(
            "hidden"
        );
}


/* ============================================================
   SEEING / LOOKING
   ============================================================ */

function angleDifference(
    a,
    b
) {

    let d =
        a - b;

    while (
        d > Math.PI
    ) {
        d -=
            Math.PI * 2;
    }

    while (
        d < -Math.PI
    ) {
        d +=
            Math.PI * 2;
    }

    return d;
}


function objectInView(
    x,
    z,
    maximumAngle = 0.35
) {

    const dx =
        x - player.x;

    const dz =
        z - player.z;

    const angle =
        Math.atan2(
            dx,
            -dz
        );

    return (
        Math.abs(
            angleDifference(
                angle,
                player.yaw
            )
        ) <
        maximumAngle
    );
}


/* ============================================================
   SEGMENTS
   ============================================================ */

function getSegment(
    index
) {

    if (
        !world.generated.has(index)
    ) {

        const random =
            seededRandom(
                index +
                world.seed
            );

        world.generated.set(
            index,
            {
                wallTypeLeft:
                    random(),

                wallTypeRight:
                    random(),

                mutation:
                    random(),

                presence:
                    random()
            }
        );
    }

    return world.generated.get(
        index
    );
}


function seededRandom(
    value
) {

    const x =
        Math.sin(value * 12.9898) *
        43758.5453;

    return (
        x -
        Math.floor(x)
    );
}


/* ============================================================
   DYNAMIC HORROR SYSTEM
   ============================================================ */

function updateWorld(
    delta
) {

    const currentSegment =
        Math.floor(
            Math.abs(player.z) /
            SEGMENT_LENGTH
        );

    /*
        Detect movement.
    */

    const moved =
        Math.abs(
            player.z -
            world.lastPlayerZ
        );

    if (
        moved < 0.002
    ) {

        world.stoppedTime +=
            delta;

    } else {

        world.stoppedTime = 0;
    }


    /*
        Detect turning around.

        Looking backwards for a while becomes a game mechanic.
    */

    const lookChange =
        Math.abs(
            angleDifference(
                player.yaw,
                world.lastLookYaw
            )
        );

    if (
        lookChange >
        2.2
    ) {

        world.lookingBack +=
            delta;

    } else {

        world.lookingBack *=
            0.95;
    }


    /*
        Distance contributes to intensity,
        but it does NOT directly schedule events.
    */

    world.totalDistance =
        Math.max(
            world.totalDistance,
            Math.abs(player.z)
        );

    world.intensity =
        Math.min(
            1,
            world.totalDistance /
            170
        );


    /*
        Backtracking is important.

        Returning to an already visited area increases
        the chance that it has changed.
    */

    if (
        currentSegment !==
        world.lastSegment
    ) {

        if (
            world.visited.has(
                currentSegment
            )
        ) {

            world.backwardsTravel += 1;

            mutateSegment(
                currentSegment
            );
        }

        world.visited.set(
            currentSegment,
            {
                visits:
                    (
                        world.visited.get(
                            currentSegment
                        )?.visits ||
                        0
                    ) + 1
            }
        );

        evaluateSegment(
            currentSegment
        );

        world.lastSegment =
            currentSegment;
    }


    /*
        Standing still can cause a presence to appear
        much later than expected.
    */

    if (
        world.stoppedTime >
        8 &&
        world.intensity >
        0.15
    ) {

        maybeSpawnPresence(
            currentSegment,
            true
        );

        world.stoppedTime = 0;
    }


    /*
        Looking behind is a strong trigger,
        but has no fixed timing.
    */

    if (
        world.lookingBack >
        1.3 &&
        world.intensity >
        0.22
    ) {

        maybeSpawnBehind(
            currentSegment
        );

        world.lookingBack = 0;
    }


    updatePresences(
        delta
    );


    world.lastPlayerZ =
        player.z;

    world.lastLookYaw =
        player.yaw;
}


/* ============================================================
   SEGMENT EVALUATION
   ============================================================ */

function evaluateSegment(
    index
) {

    const segment =
        getSegment(index);

    const random =
        Math.random();

    /*
        The first few metres remain deliberately boring.
    */

    if (
        index < 3
    ) {
        return;
    }


    /*
        Probability depends on intensity.
    */

    const intensity =
        world.intensity;


    /*
        WALL WRITING
    */

    if (
        random <
        0.10 +
        intensity * 0.14
    ) {

        segment.wallTypeLeft =
            "writing";
    }


    /*
        FACE / PHOTOGRAPH
    */

    if (
        random <
        Math.max(
            0,
            intensity - 0.22
        ) *
        0.22
    ) {

        segment.wallTypeRight =
            "face";
    }


    /*
        ORGANIC WALL
    */

    if (
        random <
        Math.max(
            0,
            intensity - 0.48
        ) *
        0.30
    ) {

        if (
            random > 0.5
        ) {

            segment.wallTypeLeft =
                "organic";

        } else {

            segment.wallTypeRight =
                "organic";
        }
    }


    /*
        CORRUPTION
    */

    if (
        random <
        Math.max(
            0,
            intensity - 0.72
        ) *
        0.45
    ) {

        segment.wallTypeLeft =
            "corrupt";

        segment.wallTypeRight =
            "corrupt";
    }


    /*
        PRESENCE

        A presence is not guaranteed.
        Some runs remain empty.
    */

    if (
        random <
        (
            0.025 +
            intensity * 0.09
        )
    ) {

        maybeSpawnPresence(
            index,
            false
        );
    }
}


/* ============================================================
   MUTATION
   ============================================================ */

function mutateSegment(
    index
) {

    const segment =
        getSegment(index);

    world.mutationCounter++;


    const severity =
        Math.min(
            1,
            world.intensity +
            world.backwardsTravel *
            0.06
        );


    const roll =
        Math.random();


    if (
        severity >
        0.25 &&
        roll < 0.35
    ) {

        segment.wallTypeLeft =
            "writing";
    }


    if (
        severity >
        0.4 &&
        roll > 0.35 &&
        roll < 0.62
    ) {

        segment.wallTypeRight =
            "face";
    }


    if (
        severity >
        0.6 &&
        roll >= 0.62 &&
        roll < 0.84
    ) {

        segment.wallTypeLeft =
            "organic";
    }


    if (
        severity >
        0.8 &&
        roll >= 0.84
    ) {

        segment.wallTypeRight =
            "corrupt";

        segment.wallTypeLeft =
            "organic";
    }


    /*
        Something has changed.
    */

    tone(
        27,
        0.8,
        0.055
    );
}


/* ============================================================
   PRESENCES
   ============================================================ */

function maybeSpawnPresence(
    segmentIndex,
    fromStillness
) {

    /*
        Don't flood the corridor.
    */

    if (
        world.presences.length >= 3
    ) {
        return;
    }


    /*
        Don't put something directly beside the player.
    */

    const distance =
        25 +
        Math.random() *
        (
            55 +
            world.intensity *
            20
        );


    const direction =
        Math.random() >
        0.72
            ? 1
            : -1;


    const z =
        player.z +
        direction *
        distance;


    /*
        Mostly ahead.

        Occasionally behind.
    */

    const presence = {

        x:
            Math.random() >
            0.5
                ? -1.5
                : 1.5,

        z,

        height:
            1.7 +
            Math.random() *
            0.5,

        scale:
            0.75 +
            Math.random() *
            0.45,

        active: true,

        seen: false,

        born:
            performance.now(),

        phase:
            Math.random() *
            100,

        stillness:
            fromStillness
    };


    world.presences.push(
        presence
    );
}


function maybeSpawnBehind(
    segmentIndex
) {

    if (
        world.presences.length >= 3
    ) {
        return;
    }


    const presence = {

        x:
            player.x +
            (
                Math.random() >
                0.5
                    ? 1.1
                    : -1.1
            ),

        z:
            player.z +
            8 +
            Math.random() * 5,

        height:
            1.8,

        scale:
            0.9,

        active:
            true,

        seen:
            false,

        born:
            performance.now(),

        phase:
            Math.random() *
            100,

        behind:
            true
    };


    world.presences.push(
        presence
    );


    /*
        No jumpscare.

        Just one very quiet sound.
    */

    tone(
        31,
        1.4,
        0.065
    );
}


function updatePresences(
    delta
) {

    for (
        const presence
        of world.presences
    ) {

        if (
            !presence.active
        ) {
            continue;
        }


        /*
            Very slow movement.

            Almost imperceptible.
        */

        const distance =
            Math.abs(
                presence.z -
                player.z
            );


        if (
            distance < 18
        ) {

            /*
                If player actually approaches,
                sometimes it disappears.

                Sometimes it remains.

                No deterministic answer.
            */

            if (
                Math.random() <
                delta *
                (
                    0.06 +
                    world.intensity *
                    0.04
                )
            ) {

                presence.active =
                    false;
            }
        }


        /*
            Detect if player is looking directly at it.
        */

        if (
            objectInView(
                presence.x,
                presence.z,
                0.16
            )
        ) {

            presence.seen =
                true;
        }


        /*
            A presence that has been seen can mutate.

            It does not necessarily move toward the player.
        */

        if (
            presence.seen &&
            world.intensity >
            0.55
        ) {

            if (
                Math.random() <
                delta * 0.018
            ) {

                presence.z +=
                    (
                        player.z >
                        presence.z
                            ? 1
                            : -1
                    ) *
                    0.4;
            }
        }
    }


    /*
        Remove dead presences.
    */

    world.presences =
        world.presences.filter(
            presence =>
                presence.active
        );
}


/* ============================================================
   DRAW CORRIDOR
   ============================================================ */

function drawCorridor() {

    const current =
        Math.floor(
            Math.abs(player.z) /
            SEGMENT_LENGTH
        );


    const start =
        Math.max(
            0,
            current - 5
        );


    const end =
        current + 18;


    for (
        let i = start;
        i < end;
        i++
    ) {

        const segment =
            getSegment(i);


        /*
            Small geometric inconsistency after mutation.
        */

        const offset =
            segment.mutation >
            0.82 &&
            world.intensity >
            0.6
                ? Math.sin(i * 4.17) * 0.12
                : 0;


        const z =
            -(
                i *
                SEGMENT_LENGTH
            ) -
            3.5;


        /*
            FLOOR
        */

        drawCube(
            offset,
            0,
            z,
            CORRIDOR_WIDTH,
            0.12,
            SEGMENT_LENGTH,
            [
                0.045,
                0.044,
                0.041
            ],
            1
        );


        /*
            CEILING
        */

        drawCube(
            offset,
            WALL_HEIGHT,
            z,
            CORRIDOR_WIDTH,
            0.12,
            SEGMENT_LENGTH,
            [
                0.022,
                0.022,
                0.021
            ],
            1
        );


        /*
            LEFT WALL
        */

        drawCube(
            offset - 2.5,
            2,
            z,
            0.12,
            4,
            SEGMENT_LENGTH,
            [
                0.032,
                0.032,
                0.03
            ],
            1
        );


        /*
            RIGHT WALL
        */

        drawCube(
            offset + 2.5,
            2,
            z,
            0.12,
            4,
            SEGMENT_LENGTH,
            [
                0.032,
                0.032,
                0.03
            ],
            1
        );


        /*
            WALL PANELS
        */

        drawWallPanel(
            offset - 2.42,
            1.95,
            z,
            segment.wallTypeLeft,
            true,
            i
        );


        drawWallPanel(
            offset + 2.42,
            1.95,
            z,
            segment.wallTypeRight,
            false,
            i
        );


        /*
            CEILING LIGHT.

            Individual lights can fail according to
            world state.
        */

        const lightRandom =
            seededRandom(
                i * 18.2 +
                world.seed
            );


        const failed =
            world.intensity >
            0.32 &&
            (
                lightRandom <
                world.intensity *
                0.25
            );


        let brightness =
            failed
                ? 0.015
                : 0.12;


        /*
            Occasional flicker later.
        */

        if (
            world.intensity >
            0.55 &&
            lightRandom <
            0.08
        ) {

            brightness *=
                (
                    0.3 +
                    Math.random() *
                    0.7
                );
        }


        drawCube(
            offset,
            3.88,
            z,
            0.72,
            0.05,
            2.0,
            [
                0.8,
                0.8,
                0.74
            ],
            brightness
        );
    }
}


/* ============================================================
   WALL PANEL
   ============================================================ */

function drawWallPanel(
    x,
    y,
    z,
    type,
    left,
    index
) {

    let texture =
        textures.normal;


    if (
        type === "writing"
    ) {

        texture =
            textures.writing;
    }


    if (
        type === "face"
    ) {

        texture =
            textures.face;
    }


    if (
        type === "organic"
    ) {

        texture =
            textures.organic;
    }


    if (
        type === "corrupt"
    ) {

        texture =
            textures.corrupt;
    }


    let brightness =
        type === "normal"
            ? 0.55
            : 0.48;


    /*
        Organic material becomes darker,
        not brighter.
    */

    if (
        type === "organic"
    ) {

        brightness =
            0.42;
    }


    drawCube(
        x,
        y,
        z,
        0.035,
        2.0,
        3.9,
        [
            0.82,
            0.82,
            0.78
        ],
        brightness,
        0,
        texture
    );
}


/* ============================================================
   DRAW PRESENCES
   ============================================================ */

function drawPresences() {

    for (
        const presence
        of world.presences
    ) {

        if (
            !presence.active
        ) {
            continue;
        }


        const distance =
            Math.abs(
                presence.z -
                player.z
            );


        /*
            Very distant presences are barely visible.
        */

        if (
            distance >
            80
        ) {
            continue;
        }


        const visibility =
            Math.max(
                0.015,
                Math.min(
                    0.15,
                    0.02 +
                    (
                        1 -
                        distance / 80
                    ) *
                    0.13
                )
            );


        const height =
            presence.height;


        /*
            Body.
        */

        drawCube(
            presence.x,
            height * 0.58,
            presence.z,
            0.35 *
                presence.scale,
            height,
            0.25 *
                presence.scale,
            [
                0.005,
                0.005,
                0.005
            ],
            visibility
        );


        /*
            Head.
        */

        drawCube(
            presence.x,
            height + 0.25,
            presence.z,
            0.34 *
                presence.scale,
            0.36 *
                presence.scale,
            0.34 *
                presence.scale,
            [
                0.003,
                0.003,
                0.003
            ],
            visibility
        );


        /*
            Long arms.
        */

        drawCube(
            presence.x - 0.35,
            height * 0.55,
            presence.z,
            0.10,
            height * 0.95,
            0.10,
            [
                0.004,
                0.004,
                0.004
            ],
            visibility
        );


        drawCube(
            presence.x + 0.35,
            height * 0.55,
            presence.z,
            0.10,
            height * 0.95,
            0.10,
            [
                0.004,
                0.004,
                0.004
            ],
            visibility
        );
    }
}


/* ============================================================
   CAMERA
   ============================================================ */

function buildView() {

    /*
        Fixed standing height.

        No flying.
        No roll.
        No free vertical movement.
    */

    const walkingBob =
        player.moving
            ? Math.sin(
                player.bob
            ) * 0.025
            : 0;


    let view =
        rotationX(
            player.pitch
        );


    view =
        multiply(
            view,
            rotationY(
                player.yaw
            )
        );


    view =
        multiply(
            view,
            translation(
                -player.x,
                -(
                    player.y +
                    walkingBob
                ),
                -player.z
            )
        );


    return view;
}


/* ============================================================
   PLAYER MOVEMENT
   ============================================================ */

let lastStep =
    0;


function updatePlayer(
    delta
) {

    if (!started) {
        return;
    }


    let forward = 0;
    let strafe = 0;


    if (
        keys["KeyW"]
    ) {
        forward += 1;
    }


    if (
        keys["KeyS"]
    ) {
        forward -= 1;
    }


    if (
        keys["KeyA"]
    ) {
        strafe -= 1;
    }


    if (
        keys["KeyD"]
    ) {
        strafe += 1;
    }


    const magnitude =
        Math.hypot(
            forward,
            strafe
        );


    player.moving =
        magnitude > 0;


    if (
        magnitude > 0
    ) {

        forward /=
            magnitude;

        strafe /=
            magnitude;


        /*
            FPS movement.

            Y is NEVER changed.

            The camera rotates around the
            player's standing position.
        */

        const speed =
            player.walkSpeed *
            delta;


        const forwardX =
            Math.sin(
                player.yaw
            );


        const forwardZ =
            -Math.cos(
                player.yaw
            );


        const rightX =
            Math.cos(
                player.yaw
            );


        const rightZ =
            Math.sin(
                player.yaw
            );


        player.x +=
            (
                forwardX *
                forward +
                rightX *
                strafe
            ) *
            speed;


        player.z +=
            (
                forwardZ *
                forward +
                rightZ *
                strafe
            ) *
            speed;


        /*
            Corridor collision.

            The player stays on the floor.
        */

        player.x =
            Math.max(
                -2.05,
                Math.min(
                    2.05,
                    player.x
                )
            );


        player.bob +=
            delta * 9;


        if (
            performance.now() -
            lastStep >
            470
        ) {

            footstep(
                player.x / 2.2
            );

            lastStep =
                performance.now();
        }
    }


    /*
        Smooth head rotation.
    */

    player.yaw +=
        (
            player.targetYaw -
            player.yaw
        ) *
        Math.min(
            1,
            delta * 14
        );


    player.pitch +=
        (
            player.targetPitch -
            player.pitch
        ) *
        Math.min(
            1,
            delta * 14
        );
}


/* ============================================================
   RENDER
   ============================================================ */

function render() {

    resize();


    gl.clearColor(
        0.001,
        0.001,
        0.001,
        1
    );


    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );


    gl.enable(
        gl.DEPTH_TEST
    );


    const aspect =
        canvas.width /
        canvas.height;


    const projection =
        perspective(
            Math.PI / 2.5,
            aspect,
            0.05,
            180
        );


    const view =
        buildView();


    gl.uniformMatrix4fv(
        projectionLocation,
        false,
        projection
    );


    gl.uniformMatrix4fv(
        viewLocation,
        false,
        view
    );


    drawCorridor();

    drawPresences();
}


/* ============================================================
   RESIZE
   ============================================================ */

function resize() {

    const ratio =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );


    const width =
        Math.floor(
            canvas.clientWidth *
            ratio
        );


    const height =
        Math.floor(
            canvas.clientHeight *
            ratio
        );


    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {

        canvas.width =
            width;

        canvas.height =
            height;


        gl.viewport(
            0,
            0,
            width,
            height
        );
    }
}


/* ============================================================
   GAME LOOP
   ============================================================ */

let previous =
    performance.now();


function frame(now) {

    const delta =
        Math.min(
            0.05,
            (
                now -
                previous
            ) / 1000
        );


    previous =
        now;


    if (started) {

        updatePlayer(
            delta
        );

        updateWorld(
            delta
        );
    }


    render();


    requestAnimationFrame(
        frame
    );
}


requestAnimationFrame(
    frame
);


/* ============================================================
   INITIAL STATE
   ============================================================ */

gl.enable(
    gl.DEPTH_TEST
);

gl.clearColor(
    0,
    0,
    0,
    1
);
