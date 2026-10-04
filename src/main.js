// ============================================================
// ROOM_01
// ============================================================

const canvas = document.getElementById("canvas");
const boot = document.getElementById("boot");

const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: false,
    depth: true
});

if (!gl) {
    throw new Error("WebGL unavailable.");
}


// ============================================================
// SHADERS
// ============================================================

const vertexSource = `
attribute vec3 aPosition;
attribute vec2 aUV;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

varying vec2 vUV;
varying vec3 vWorld;

void main() {

    vec4 world =
        uModel *
        vec4(aPosition, 1.0);

    vWorld = world.xyz;
    vUV = aUV;

    gl_Position =
        uProjection *
        uView *
        world;
}
`;

const fragmentSource = `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uLightPosition;
uniform vec3 uCamera;
uniform float uAmbient;

uniform sampler2D uTexture;
uniform float uUseTexture;

varying vec2 vUV;
varying vec3 vWorld;

void main() {

    vec3 color = uColor;

    if (uUseTexture > 0.5) {
        color *= texture2D(
            uTexture,
            vUV
        ).rgb;
    }

    float distanceToLight =
        distance(
            vWorld,
            uLightPosition
        );

    float light =
        1.0 -
        smoothstep(
            0.0,
            10.0,
            distanceToLight
        );

    color *=
        uAmbient +
        light * 0.75;

    float distanceToCamera =
        distance(
            vWorld,
            uCamera
        );

    float fog =
        smoothstep(
            18.0,
            42.0,
            distanceToCamera
        );

    color =
        mix(
            color,
            vec3(
                0.008,
                0.008,
                0.007
            ),
            fog
        );

    color =
        pow(
            max(
                color,
                vec3(0.0)
            ),
            vec3(0.82)
        );

    gl_FragColor =
        vec4(color, 1.0);
}
`;


function shader(type, source) {

    const s =
        gl.createShader(type);

    gl.shaderSource(
        s,
        source
    );

    gl.compileShader(s);

    if (!gl.getShaderParameter(
        s,
        gl.COMPILE_STATUS
    )) {

        console.error(
            gl.getShaderInfoLog(s)
        );

        throw new Error(
            "Shader error."
        );
    }

    return s;
}


function program() {

    const p =
        gl.createProgram();

    gl.attachShader(
        p,
        shader(
            gl.VERTEX_SHADER,
            vertexSource
        )
    );

    gl.attachShader(
        p,
        shader(
            gl.FRAGMENT_SHADER,
            fragmentSource
        )
    );

    gl.linkProgram(p);

    if (!gl.getProgramParameter(
        p,
        gl.LINK_STATUS
    )) {

        console.error(
            gl.getProgramInfoLog(p)
        );

        throw new Error(
            "Program link error."
        );
    }

    return p;
}


const programObject =
    program();

gl.useProgram(
    programObject
);


// ============================================================
// LOCATIONS
// ============================================================

const loc = {

    position:
        gl.getAttribLocation(
            programObject,
            "aPosition"
        ),

    uv:
        gl.getAttribLocation(
            programObject,
            "aUV"
        ),

    projection:
        gl.getUniformLocation(
            programObject,
            "uProjection"
        ),

    view:
        gl.getUniformLocation(
            programObject,
            "uView"
        ),

    model:
        gl.getUniformLocation(
            programObject,
            "uModel"
        ),

    color:
        gl.getUniformLocation(
            programObject,
            "uColor"
        ),

    light:
        gl.getUniformLocation(
            programObject,
            "uLightPosition"
        ),

    camera:
        gl.getUniformLocation(
            programObject,
            "uCamera"
        ),

    ambient:
        gl.getUniformLocation(
            programObject,
            "uAmbient"
        ),

    texture:
        gl.getUniformLocation(
            programObject,
            "uTexture"
        ),

    useTexture:
        gl.getUniformLocation(
            programObject,
            "uUseTexture"
        )
};


// ============================================================
// CUBE
// ============================================================

const vertices = new Float32Array([

    // front
    -0.5,-0.5, 0.5, 0,0,
     0.5,-0.5, 0.5, 1,0,
     0.5, 0.5, 0.5, 1,1,
    -0.5, 0.5, 0.5, 0,1,

    // back
     0.5,-0.5,-0.5, 0,0,
    -0.5,-0.5,-0.5, 1,0,
    -0.5, 0.5,-0.5, 1,1,
     0.5, 0.5,-0.5, 0,1,

    // left
    -0.5,-0.5,-0.5, 0,0,
    -0.5,-0.5, 0.5, 1,0,
    -0.5, 0.5, 0.5, 1,1,
    -0.5, 0.5,-0.5, 0,1,

    // right
     0.5,-0.5, 0.5, 0,0,
     0.5,-0.5,-0.5, 1,0,
     0.5, 0.5,-0.5, 1,1,
     0.5, 0.5, 0.5, 0,1,

    // top
    -0.5,0.5, 0.5, 0,0,
     0.5,0.5, 0.5, 1,0,
     0.5,0.5,-0.5, 1,1,
    -0.5,0.5,-0.5, 0,1,

    // bottom
    -0.5,-0.5,-0.5, 0,0,
     0.5,-0.5,-0.5, 1,0,
     0.5,-0.5, 0.5, 1,1,
    -0.5,-0.5, 0.5, 0,1
]);


const indices = new Uint16Array([

     0,1,2, 0,2,3,
     4,5,6, 4,6,7,
     8,9,10, 8,10,11,
    12,13,14, 12,14,15,
    16,17,18, 16,18,19,
    20,21,22, 20,22,23
]);


const vertexBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    vertexBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    vertices,
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
    indices,
    gl.STATIC_DRAW
);


gl.enableVertexAttribArray(
    loc.position
);

gl.vertexAttribPointer(
    loc.position,
    3,
    gl.FLOAT,
    false,
    20,
    0
);


gl.enableVertexAttribArray(
    loc.uv
);

gl.vertexAttribPointer(
    loc.uv,
    2,
    gl.FLOAT,
    false,
    20,
    12
);


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
        2 * far * near * nf,
        0
    ]);
}


function normalize(v) {

    const n =
        Math.hypot(
            v[0],
            v[1],
            v[2]
        );

    return [
        v[0] / n,
        v[1] / n,
        v[2] / n
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
            up[1] * z[2] -
            up[2] * z[1],

            up[2] * z[0] -
            up[0] * z[2],

            up[0] * z[1] -
            up[1] * z[0]
        ]);

    const y = [

        z[1] * x[2] -
        z[2] * x[1],

        z[2] * x[0] -
        z[0] * x[2],

        z[0] * x[1] -
        z[1] * x[0]
    ];

    return new Float32Array([

        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,

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


function multiply(a, b) {

    const out =
        new Float32Array(16);

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

            out[
                col * 4 + row
            ] =

                a[row] *
                b[col * 4] +

                a[4 + row] *
                b[col * 4 + 1] +

                a[8 + row] *
                b[col * 4 + 2] +

                a[12 + row] *
                b[col * 4 + 3];
        }
    }

    return out;
}


function translation(
    x,
    y,
    z
) {

    return new Float32Array([

        1,0,0,0,
        0,1,0,0,
        0,0,1,0,

        x,y,z,1
    ]);
}


function scale(
    x,
    y,
    z
) {

    return new Float32Array([

        x,0,0,0,
        0,y,0,0,
        0,0,z,0,

        0,0,0,1
    ]);
}


// ============================================================
// PERSISTENT STATE
// ============================================================

const STORAGE_KEY =
    "room01_state_v1";


function loadState() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!raw) {

            return {

                executions: 0,

                rooms: {},

                objectsSeen: {},

                totalDistance: 0
            };
        }

        return JSON.parse(raw);

    } catch {

        return {

            executions: 0,

            rooms: {},

            objectsSeen: {},

            totalDistance: 0
        };
    }
}


const persistent =
    loadState();


persistent.executions++;


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                persistent
            )
        );

    } catch {
        // Ignore storage errors.
    }
}


saveState();


// ============================================================
// WORLD
// ============================================================

const ROOM_LENGTH = 12;
const ROOM_WIDTH = 6;
const ROOM_HEIGHT = 4;

const world = {

    room: 0,

    visitedRooms: new Set(),

    lookedAt: null,

    returnCount: 0,

    strangeLevel: 0
};


function roomState(id) {

    const key =
        String(id);

    if (
        !persistent.rooms[key]
    ) {

        persistent.rooms[key] = {

            visits: 0,

            changed: false,

            chairMoved: false,

            secondChair: false,

            doorMoved: false,

            lightChanged: false,

            impossible: false
        };
    }

    return persistent.rooms[key];
}


// ============================================================
// ROOMS
// ============================================================

function roomCenter(id) {

    return id * ROOM_LENGTH;
}


function updateRoom() {

    const newRoom =
        Math.floor(
            player.z /
            ROOM_LENGTH
        );

    if (
        newRoom === world.room
    ) {
        return;
    }

    world.room =
        newRoom;

    const state =
        roomState(newRoom);

    state.visits++;

    world.visitedRooms.add(
        newRoom
    );

    persistent.totalDistance =
        Math.max(
            persistent.totalDistance,
            Math.abs(player.z)
        );


    // --------------------------------------------------------
    // The room remembers being visited.
    // --------------------------------------------------------

    if (
        state.visits >= 2
    ) {

        state.changed = true;
    }


    // --------------------------------------------------------
    // More visits create contradictions.
    // These are not scheduled events.
    // They are consequences of returning.
    // --------------------------------------------------------

    if (
        state.visits >= 2 &&
        Math.random() < 0.55
    ) {

        state.chairMoved = true;
    }


    if (
        state.visits >= 3 &&
        Math.random() < 0.40
    ) {

        state.secondChair = true;
    }


    if (
        state.visits >= 3 &&
        Math.random() < 0.30
    ) {

        state.doorMoved = true;
    }


    if (
        state.visits >= 4
    ) {

        state.lightChanged = true;
    }


    if (
        state.visits >= 5
    ) {

        state.impossible = true;
    }

    saveState();
}


// ============================================================
// PLAYER
// ============================================================

const player = {

    x: 0,

    y: 1.7,

    z: -2,

    yaw: Math.PI,

    pitch: 0,

    speed: 3.0
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
// MOUSE
// ============================================================

canvas.addEventListener(
    "click",
    () => {

        canvas.requestPointerLock();
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

        player.pitch =
            Math.max(
                -0.75,
                Math.min(
                    0.75,
                    player.pitch
                )
            );
    }
);


// ============================================================
// OBJECT INTERACTION
// ============================================================

const objects = [];

function createObject(
    type,
    x,
    y,
    z,
    room
) {

    objects.push({

        type,

        x,

        y,

        z,

        room,

        seen: false
    });
}


// ============================================================
// AUDIO
// ============================================================

let audio = null;


function initAudio() {

    if (audio) {
        return;
    }

    audio =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    const oscillator =
        audio.createOscillator();

    const gain =
        audio.createGain();

    oscillator.type =
        "sine";

    oscillator.frequency.value =
        43;

    gain.gain.value =
        0.012;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
}


function strangeSound() {

    if (!audio) {
        return;
    }

    const oscillator =
        audio.createOscillator();

    const gain =
        audio.createGain();

    oscillator.type =
        "triangle";

    oscillator.frequency.value =
        31 +
        Math.random() * 17;

    gain.gain.value =
        0.025;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    const now =
        audio.currentTime;

    gain.gain.setValueAtTime(
        0.025,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.8
    );

    oscillator.start(now);

    oscillator.stop(
        now + 1.8
    );
}


// ============================================================
// DRAW
// ============================================================

function drawCube(
    x,
    y,
    z,
    sx,
    sy,
    sz,
    color
) {

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
        loc.model,
        false,
        model
    );

    gl.uniform3fv(
        loc.color,
        color
    );

    gl.uniform1f(
        loc.useTexture,
        0
    );

    gl.drawElements(
        gl.TRIANGLES,
        indices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}


// ============================================================
// ROOM GEOMETRY
// ============================================================

function drawRoom(
    id
) {

    const state =
        roomState(id);

    const center =
        roomCenter(id);

    const wall = [
        0.42,
        0.40,
        0.37
    ];

    const floor = [
        0.34,
        0.32,
        0.30
    ];


    // Floor

    drawCube(

        center,
        -0.05,
        center,
        ROOM_WIDTH,
        0.1,
        ROOM_LENGTH,
        floor
    );


    // Ceiling

    drawCube(

        center,
        ROOM_HEIGHT,
        center,
        ROOM_WIDTH,
        0.1,
        ROOM_LENGTH,
        wall
    );


    // Left wall

    drawCube(

        center -
        ROOM_WIDTH / 2,

        ROOM_HEIGHT / 2,

        center,

        0.12,

        ROOM_HEIGHT,

        ROOM_LENGTH,

        wall
    );


    // Right wall

    drawCube(

        center +
        ROOM_WIDTH / 2,

        ROOM_HEIGHT / 2,

        center,

        0.12,

        ROOM_HEIGHT,

        ROOM_LENGTH,

        wall
    );


    // --------------------------------------------------------
    // End wall.
    //
    // Normally the corridor continues.
    // Certain persistent rooms can acquire an
    // inexplicable internal wall.
    // --------------------------------------------------------

    if (
        !state.impossible
    ) {

        drawCube(

            center,

            ROOM_HEIGHT / 2,

            center +
            ROOM_LENGTH / 2,

            ROOM_WIDTH,

            ROOM_HEIGHT,

            0.12,

            wall
        );

    } else {

        // The wall is moved one metre.
        // It creates a subtle spatial contradiction.

        drawCube(

            center,

            ROOM_HEIGHT / 2,

            center +
            ROOM_LENGTH / 2 -
            1.4,

            ROOM_WIDTH,

            ROOM_HEIGHT,

            0.12,

            wall
        );
    }


    // --------------------------------------------------------
    // Ceiling light
    // --------------------------------------------------------

    const lightColor =
        state.lightChanged
            ? [
                0.35,
                0.32,
                0.29
            ]
            : [
                0.95,
                0.90,
                0.78
            ];

    drawCube(

        center,

        ROOM_HEIGHT -
        0.08,

        center,

        1.5,

        0.04,

        0.25,

        lightColor
    );


    // --------------------------------------------------------
    // Door
    // --------------------------------------------------------

    const doorZ =
        state.doorMoved
            ? center +
              ROOM_LENGTH / 2 -
              2
            : center +
              ROOM_LENGTH / 2 -
              0.08;

    drawCube(

        center,

        1.35,

        doorZ,

        1.4,

        2.7,

        0.10,

        [
            0.18,
            0.17,
            0.16
        ]
    );


    // --------------------------------------------------------
    // Chair
    // --------------------------------------------------------

    let chairX =
        center - 1.2;

    let chairZ =
        center + 1;

    if (
        state.chairMoved
    ) {

        chairX =
            center + 1.15;

        chairZ =
            center - 1.2;
    }

    drawChair(
        chairX,
        chairZ
    );


    // --------------------------------------------------------
    // Second chair
    // --------------------------------------------------------

    if (
        state.secondChair
    ) {

        drawChair(

            center - 1.0,

            center - 2.3
        );
    }
}


function drawChair(
    x,
    z
) {

    const wood = [
        0.24,
        0.22,
        0.20
    ];


    // seat

    drawCube(
        x,
        0.85,
        z,
        0.9,
        0.15,
        0.9,
        wood
    );


    // back

    drawCube(
        x,
        1.45,
        z + 0.35,
        0.9,
        1.2,
        0.12,
        wood
    );


    // legs

    drawCube(
        x - 0.32,
        0.4,
        z - 0.32,
        0.12,
        0.8,
        0.12,
        wood
    );

    drawCube(
        x + 0.32,
        0.4,
        z - 0.32,
        0.12,
        0.8,
        0.12,
        wood
    );

    drawCube(
        x - 0.32,
        0.4,
        z + 0.32,
        0.12,
        0.8,
        0.12,
        wood
    );

    drawCube(
        x + 0.32,
        0.4,
        z + 0.32,
        0.12,
        0.8,
        0.12,
        wood
    );
}


// ============================================================
// IMPOSSIBLE OBJECT
// ============================================================

function drawImpossibleObject() {

    if (
        persistent.executions < 3
    ) {
        return;
    }

    const room =
        0;

    const state =
        roomState(room);

    if (
        !state.impossible
    ) {
        return;
    }

    // A completely ordinary rectangular object
    // intersecting the wall in a way that should
    // not be possible.

    drawCube(

        -1.7,

        1.0,

        ROOM_LENGTH / 2 - 0.7,

        1.8,

        1.8,

        1.8,

        [
            0.12,
            0.11,
            0.10
        ]
    );
}


// ============================================================
// OBJECT OBSERVATION
// ============================================================

function observeWorld() {

    for (
        const object of objects
    ) {

        if (
            object.room !==
            world.room
        ) {
            continue;
        }

        const dx =
            player.x -
            object.x;

        const dz =
            player.z -
            object.z;

        const distance =
            Math.hypot(
                dx,
                dz
            );

        if (
            distance < 2.4 &&
            !object.seen
        ) {

            object.seen = true;

            const key =
                `${object.type}_${object.room}`;

            persistent.objectsSeen[key] =
                true;

            saveState();
        }
    }
}


// ============================================================
// WALKING
// ============================================================

let lastPosition = {
    x: player.x,
    z: player.z
};


function updatePlayer(dt) {

    let forward = 0;
    let strafe = 0;

    if (keys["w"]) {
        forward++;
    }

    if (keys["s"]) {
        forward--;
    }

    if (keys["a"]) {
        strafe--;
    }

    if (keys["d"]) {
        strafe++;
    }


    if (
        forward === 0 &&
        strafe === 0
    ) {
        return;
    }


    const length =
        Math.hypot(
            forward,
            strafe
        );

    forward /= length;
    strafe /= length;


    const fx =
        -Math.sin(
            player.yaw
        );

    const fz =
        -Math.cos(
            player.yaw
        );

    const rx =
        Math.cos(
            player.yaw
        );

    const rz =
        -Math.sin(
            player.yaw
        );


    player.x +=
        (
            fx * forward +
            rx * strafe
        ) *
        player.speed *
        dt;


    player.z +=
        (
            fz * forward +
            rz * strafe
        ) *
        player.speed *
        dt;


    // --------------------------------------------------------
    // Collision with corridor walls.
    // --------------------------------------------------------

    const limit =
        ROOM_WIDTH / 2 -
        0.35;

    player.x =
        Math.max(
            -limit,
            Math.min(
                limit,
                player.x
            )
        );


    persistent.totalDistance +=
        Math.hypot(

            player.x -
            lastPosition.x,

            player.z -
            lastPosition.z
        );

    lastPosition.x =
        player.x;

    lastPosition.z =
        player.z;
}


// ============================================================
// CAMERA
// ============================================================

function render() {

    gl.clearColor(
        0.006,
        0.006,
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

            100
        );


    gl.uniformMatrix4fv(
        loc.projection,
        false,
        projection
    );


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
        direction.x,

        player.y +
        direction.y,

        player.z +
        direction.z
    ];


    const view =
        lookAt(

            [
                player.x,
                player.y,
                player.z
            ],

            target,

            [0,1,0]
        );


    gl.uniformMatrix4fv(
        loc.view,
        false,
        view
    );


    gl.uniform3fv(
        loc.camera,
        [
            player.x,
            player.y,
            player.z
        ]
    );


    // --------------------------------------------------------
    // Light
    // --------------------------------------------------------

    const currentRoom =
        roomState(
            world.room
        );

    const roomCenterZ =
        roomCenter(
            world.room
        );


    gl.uniform3fv(
        loc.light,
        [

            roomCenterZ === 0
                ? 0
                : 0,

            ROOM_HEIGHT - 0.15,

            roomCenterZ
        ]
    );


    gl.uniform1f(
        loc.ambient,
        currentRoom.lightChanged
            ? 0.16
            : 0.24
    );


    // --------------------------------------------------------
    // Draw nearby rooms.
    // --------------------------------------------------------

    for (
        let i =
            world.room - 2;

        i <=
        world.room + 3;

        i++
    ) {

        drawRoom(i);
    }


    drawImpossibleObject();
}


// ============================================================
// RESIZE
// ============================================================

function resize() {

    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    canvas.width =
        Math.floor(
            innerWidth * dpr
        );

    canvas.height =
        Math.floor(
            innerHeight * dpr
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


// ============================================================
// START
// ============================================================

let started = false;


function start() {

    if (started) {
        return;
    }

    started = true;

    boot.classList.add(
        "hidden"
    );

    initAudio();

    canvas.requestPointerLock();

    strangeSound();
}


boot.addEventListener(
    "click",
    start
);


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


// ============================================================
// LOOP
// ============================================================

let lastTime =
    performance.now();


function loop(now) {

    const dt =
        Math.min(
            (now - lastTime) /
            1000,
            0.05
        );

    lastTime =
        now;


    if (started) {

        updatePlayer(dt);

        updateRoom();

        observeWorld();

        render();
    }


    requestAnimationFrame(
        loop
    );
}


requestAnimationFrame(
    loop
);
