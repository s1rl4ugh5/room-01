const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    throw new Error("WebGL is not supported.");
}


// ============================================================
// SHADERS
// ============================================================

const vertexShaderSource = `

attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_normal;
varying vec3 v_worldPosition;

void main() {

    vec4 worldPosition =
        u_model *
        vec4(a_position, 1.0);

    v_worldPosition =
        worldPosition.xyz;

    v_normal =
        mat3(u_model) *
        a_normal;

    gl_Position =
        u_projection *
        u_view *
        worldPosition;
}
`;


const fragmentShaderSource = `

precision mediump float;

varying vec3 v_normal;
varying vec3 v_worldPosition;

uniform vec3 u_lightPosition;

void main() {

    vec3 normal =
        normalize(v_normal);

    vec3 lightDirection =
        normalize(
            u_lightPosition -
            v_worldPosition
        );

    float diffuse =
        max(
            dot(
                normal,
                lightDirection
            ),
            0.0
        );

    float ambient = 0.45;

    float light =
        ambient +
        diffuse * 0.75;

    vec3 baseColor =
        vec3(
            0.32,
            0.36,
            0.40
        );

    vec3 finalColor =
        baseColor *
        light;

    gl_FragColor =
        vec4(
            finalColor,
            1.0
        );
}
`;


// ============================================================
// SHADER CREATION
// ============================================================

function createShader(type, source) {

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

        gl.deleteShader(shader);

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

    gl.linkProgram(
        program
    );

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
    createProgram(
        vertexShaderSource,
        fragmentShaderSource
    );

gl.useProgram(program);


// ============================================================
// CUBE GEOMETRY
// ============================================================

function createCube() {

    const positions = [

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

        // TOP
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,

        // BOTTOM
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,

        // RIGHT
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,
         0.5, -0.5,  0.5,

        // LEFT
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5
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

        // TOP
         0,  1,  0,
         0,  1,  0,
         0,  1,  0,
         0,  1,  0,

        // BOTTOM
         0, -1,  0,
         0, -1,  0,
         0, -1,  0,
         0, -1,  0,

        // RIGHT
         1,  0,  0,
         1,  0,  0,
         1,  0,  0,
         1,  0,  0,

        // LEFT
        -1,  0,  0,
        -1,  0,  0,
        -1,  0,  0,
        -1,  0,  0
    ];


    const indices = [

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
    ];


    return {
        positions,
        normals,
        indices
    };
}


const cube =
    createCube();


// ============================================================
// GPU BUFFERS
// ============================================================

function createBuffer(data) {

    const buffer =
        gl.createBuffer();

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(data),
        gl.STATIC_DRAW
    );

    return buffer;
}


const positionBuffer =
    createBuffer(
        cube.positions
    );


const normalBuffer =
    createBuffer(
        cube.normals
    );


const indexBuffer =
    gl.createBuffer();

gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,
    indexBuffer
);

gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(
        cube.indices
    ),
    gl.STATIC_DRAW
);


// ============================================================
// ATTRIBUTES
// ============================================================

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


// ============================================================
// MATRIX FUNCTIONS
// ============================================================

function identity() {

    return new Float32Array([

        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}


function translation(
    x,
    y,
    z
) {

    const matrix =
        identity();

    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;

    return matrix;
}


function scale(
    x,
    y,
    z
) {

    const matrix =
        identity();

    matrix[0] = x;
    matrix[5] = y;
    matrix[10] = z;

    return matrix;
}


function multiply(a, b) {

    const result =
        new Float32Array(16);

    for (
        let row = 0;
        row < 4;
        row++
    ) {

        for (
            let column = 0;
            column < 4;
            column++
        ) {

            result[
                column * 4 + row
            ] =

                a[row] *
                b[column * 4]

                +

                a[4 + row] *
                b[column * 4 + 1]

                +

                a[8 + row] *
                b[column * 4 + 2]

                +

                a[12 + row] *
                b[column * 4 + 3];
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
        (near + far) * range,
        -1,

        0,
        0,
        near * far * range * 2,
        0
    ]);
}


function rotationY(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return new Float32Array([

         c, 0, -s, 0,
         0, 1,  0, 0,
         s, 0,  c, 0,
         0, 0,  0, 1
    ]);
}


function rotationX(angle) {

    const c =
        Math.cos(angle);

    const s =
        Math.sin(angle);

    return new Float32Array([

        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1
    ]);
}


// ============================================================
// CAMERA
// ============================================================

// IMPORTANT:
//
// The room goes from -5 to +5 on the Z axis.
// We start at Z = 3, therefore INSIDE the room.
//
// The camera initially looks toward -Z.
//
// ============================================================

const camera = {

    position: {

        x: 0,

        y: 1.7,

        z: 3
    },

    yaw: 0,

    pitch: 0,

    speed: 4
};


const keys = {};


// ============================================================
// KEYBOARD
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        // ENTER activates pointer lock.
        if (
            event.code === "Enter" &&
            !pointerLocked
        ) {

            canvas.requestPointerLock();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


// ============================================================
// POINTER LOCK
// ============================================================

let pointerLocked =
    false;


canvas.addEventListener(
    "click",
    () => {

        canvas.requestPointerLock();
    }
);


document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement ===
            canvas;


        document.getElementById(
            "status"
        ).textContent =

            pointerLocked

                ? "WASD / MOUSE / ENTER"

                : "CLICK OR ENTER";
    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (!pointerLocked) {
            return;
        }


        const sensitivity =
            0.002;


        camera.yaw -=
            event.movementX *
            sensitivity;


        camera.pitch -=
            event.movementY *
            sensitivity;


        const limit =
            Math.PI / 2 -
            0.05;


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


// ============================================================
// CAMERA MOVEMENT
// ============================================================

function updateCamera(deltaTime) {

    let forward = 0;
    let right = 0;


    // W = FORWARD
    if (keys["KeyW"]) {
        forward += 1;
    }


    // S = BACKWARD
    if (keys["KeyS"]) {
        forward -= 1;
    }


    // D = RIGHT
    if (keys["KeyD"]) {
        right += 1;
    }


    // A = LEFT
    if (keys["KeyA"]) {
        right -= 1;
    }


    const length =
        Math.hypot(
            forward,
            right
        );


    if (length === 0) {
        return;
    }


    forward /= length;
    right /= length;


    const speed =
        camera.speed *
        deltaTime;


    const sin =
        Math.sin(
            camera.yaw
        );


    const cos =
        Math.cos(
            camera.yaw
        );


    // FIXED:
    //
    // W now moves toward the direction
    // the camera is looking.
    //

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
}


// ============================================================
// VIEW MATRIX
// ============================================================

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


// ============================================================
// ROOM
// ============================================================

const objects = [

    // FLOOR
    {
        position: [0, -0.1, 0],
        scale: [10, 0.2, 10]
    },


    // CEILING
    {
        position: [0, 4, 0],
        scale: [10, 0.2, 10]
    },


    // BACK WALL
    {
        position: [0, 2, -5],
        scale: [10, 4, 0.2]
    },


    // FRONT WALL
    {
        position: [0, 2, 5],
        scale: [10, 4, 0.2]
    },


    // LEFT WALL
    {
        position: [-5, 2, 0],
        scale: [0.2, 4, 10]
    },


    // RIGHT WALL
    {
        position: [5, 2, 0],
        scale: [0.2, 4, 10]
    },


    // CENTRAL OBJECT
    {
        position: [0, 1, 0],
        scale: [1, 2, 1]
    }
];


// ============================================================
// UNIFORMS
// ============================================================

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


const lightLocation =
    gl.getUniformLocation(
        program,
        "u_lightPosition"
    );


// ============================================================
// RESIZE
// ============================================================

function resize() {

    const pixelRatio =
        window.devicePixelRatio ||
        1;


    const width =
        canvas.clientWidth *
        pixelRatio;


    const height =
        canvas.clientHeight *
        pixelRatio;


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


window.addEventListener(
    "resize",
    resize
);


// ============================================================
// RENDER
// ============================================================

let previousTime = 0;


function render(time) {

    const deltaTime =
        Math.min(
            (time - previousTime) / 1000,
            0.1
        );


    previousTime =
        time;


    resize();


    updateCamera(
        deltaTime
    );


    gl.enable(
        gl.DEPTH_TEST
    );


    gl.clearColor(
        0.025,
        0.03,
        0.04,
        1
    );


    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
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


    // Light positioned above the room.
    gl.uniform3f(
        lightLocation,
        0,
        8,
        1
    );


    for (
        const object of objects
    ) {

        const model =
            multiply(

                translation(
                    object.position[0],
                    object.position[1],
                    object.position[2]
                ),

                scale(
                    object.scale[0],
                    object.scale[1],
                    object.scale[2]
                )
            );


        gl.uniformMatrix4fv(
            modelLocation,
            false,
            model
        );


        gl.drawElements(
            gl.TRIANGLES,
            cube.indices.length,
            gl.UNSIGNED_SHORT,
            0
        );
    }


    requestAnimationFrame(
        render
    );
}


requestAnimationFrame(
    render
);
