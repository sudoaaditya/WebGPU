// Global Vartiables
var canvas = null;
var bFullScreen = false;
var canvasOriginalWidth;
var canvasOriginalHeight;

//WebGPU related
var clearColor;
var clearColor_fbo;
let device = null;
let context = null;
let queue = null;
let canvasFormat = null;
let animationFrameId = null;
let perspectiveProjectionMatrix = null;
let perspectiveProjectionMatrix_fbo = null;
let depthTexture = null;

// Teapot related declarations
const FBO_WIDTH = 512;
const FBO_HEIGHT = 512;
// render target texture for teapot
let texture_teapot_color = null;
let texture_teapot_depth = null;
let texture_marble = null;
let sampler_marble = null;
let sampler_teapot = null;
let renderPipeline_teapot = null;
let buffer_uniform_teapot = null;
let bindingGroup_uniform_teapot = null;
let bindingGroup_marble_texture_sampler_teapot = null;
let buffer_teapot_position = null;
let buffer_teapot_normal = null;
let buffer_teapot_texcoord = null;
let buffer_teapot_element = null;

// Cube related declarations
let renderPipeline_cube = null;
let buffer_uniform_cube = null;
let bindingGroup_uniform_cube = null;
let bindingGroup_teapot_texture_sampler_cube = null;
let buffer_cube_position = null;
let buffer_cube_texcoord = null;


// for lights
var lightAmbient = new Float32Array([0.4, 0.4, 0.4, 1.0]);
var lightDiffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
var lightSpecular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
var materialAmbient = new Float32Array([0.9, 0.5, 0.3, 1.0]);
var materialDiffuse = new Float32Array([0.9, 0.5, 0.3, 1.0]);
var materialSpecular = new Float32Array([0.8, 0.8, 0.8, 1.0]);
var materialShininess = new Float32Array([128.0, 0.0, 0.0, 1.0]);
var keyFlags = new Uint32Array([0, 0, 0, 0]); //x => Lights, y => Texture
var lightPosition = new Float32Array([100.0, 100.0, 100.0, 1.0]);
var bLighting = false;
var bTexture = false;
var bAnimation = false;
var angle_teapot = 0.0;
var angle_cube = 0.0;

// Animation related
//requestAnimationFrame for rendering!.
var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame || window.mozRequestAnimationFrame || 
                            window.oRequestAnimationFrame || null;

// TO Cancel rendering if needed in bacground processsing!
var cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame ||
                            window.webkitCancelRequestAnimationFrame || window.mozCancelAnimationFrame ||
                            window.mozCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame ||
                            window.oCancelAnimationFrame || window.CancelRequestAnimationFrame ||
                            window.msCancelAnimationFrame || null;

// Onload function
const main = async () => {

    console.log("WebGPU Blue Screen of Death!!..");
    //get canvas element
    canvas = document.getElementById("AMC");
    if(!canvas){
        console.log("Failed to Obtain Canvas!");
    }
    else {
        console.log("Canvas Obtained Successfully!!..");
    }

    canvasOriginalWidth = canvas.width;
    canvasOriginalHeight = canvas.height;

    //Register Event Handler Callback to the window!.
    window.addEventListener("keydown", onKeyDown, false);
    window.addEventListener("click", onMouseClick, false);
    window.addEventListener("resize", resize, false);

    // Best practice for WebGPU during fullscreen
    document.addEventListener("fullscreenchange", onFullScreenChange, false);
    document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);

    // Initialize WebGPU 
    // Get GPU Interface
    const gpu = navigator.gpu;
    if(!gpu){
        console.log("WebGPU is not supported in this browser!");
        throw Error("WebGPU is not supported in this browser!");
    }
    else {
        console.log("WebGPU is supported in this browser!");
    }

    // Get GPUAdapter object from GPU interface
    const adapter = await gpu.requestAdapter();
    if(!adapter){
        console.log("Failed to get GPU Adapter!");
        throw Error("Failed to get GPU Adapter!");
    }
    else {
        console.log("GPU Adapter Obtained Successfully!!..");
    }

    // Get GPUDevice object from GPUAdapter object
    device = await adapter.requestDevice();
    if(!device){
        console.log("Failed to get GPU Device!");
        throw Error("Failed to get GPU Device!");
    }
    else {
        console.log("GPU Device Obtained Successfully!!..");
    }

    // as browsers can be on mobile devices device may get lost maybe due to reset, switch, switchoff, disconnect, ect.
    // in such cases, we may not have capturable error, so register one generic handler for uncaptured error with device
    device.addEventListener("uncapturederror", onUnCapturedError);
    device.lost.then(onDeviceLost);

    // Call Stub Functions
    await initialize();

    resize();
    display();
}

// Functions
const onUnCapturedError = (event) => {
    // Code
    console.log("Uncaptured Error Occured:", event.error.message);
}

const onDeviceLost = (info) => {
    // Code
    console.warn("Device Lost Reason:", info.reason, "Message:", info.message);
    device = null;
    queue = null;
    perspectiveProjectionMatrix = null;
    perspectiveProjectionMatrix_fbo = null;
    depthTexture = null;

    // Teapot related resources
    texture_teapot_color = null;
    texture_teapot_depth = null;
    texture_marble = null;
    sampler_marble = null;
    sampler_teapot = null;
    renderPipeline_teapot = null;
    buffer_uniform_teapot = null;
    bindingGroup_uniform_teapot = null;
    bindingGroup_marble_texture_sampler_teapot = null;
    buffer_teapot_position = null;
    buffer_teapot_normal = null;
    buffer_teapot_texcoord = null;
    buffer_teapot_element = null;

    // Cube related resources
    renderPipeline_cube = null;
    buffer_uniform_cube = null;
    bindingGroup_uniform_cube = null;
    buffer_cube_position = null;
    buffer_cube_normal = null;
    buffer_cube_texcoord = null;

    // cube related
    renderPipeline_cube = null;
    buffer_uniform_cube = null;
    bindingGroup_uniform_cube = null;
    bindingGroup_teapot_texture_sampler_cube = null;
    buffer_cube_position = null;
    buffer_cube_texcoord = null;
}

const toggleFullScreen = () => {
    //Code
    var fullScreenElement = document.fullscreenElement || document.webkitFullScreenElement ||
                            document.mozFullScreenElement || document.msFullscreenElement || null;

    if(fullScreenElement == null) {
        if(canvas.requestFullscreen){
            canvas.requestFullscreen();
        }
        else if(canvas.mozRequestFullScreen) {
            canvas.mozRequestFullScreen();
        }
        else if(canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen();
        }
        else if(canvas.msRequestFullscreen) {
            canvas.msRequestFullscreen();
        }

        //In webGL we initialized bFullScreen here not thinking about async operations
        // but in WebGPU, considering async cross browser compatibility we will do this in onFullScreenChange event handler
    }
    else {
        if(document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
        else if(document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        else if(document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        //In webGL we initialized bFullScreen here not thinking about async operations
        // but in WebGPU, considering async cross browser compatibility we will do this in onFullScreenChange event handler
    }
}

// Event Handlers
const onFullScreenChange = () => {
    // Code
    var fullScreenElement = document.fullscreenElement || document.webkitFullScreenElement ||
                            document.mozFullScreenElement || document.msFullscreenElement || null;

    if(fullScreenElement != null) {
        bFullScreen = true;
        console.log("Window is in Fullscreen Mode!");
    }
    else {
        bFullScreen = false;
        console.log("Window is in Normal Mode!");
    }

    // Resize the canvas to fit the window
    resize();
}

// Initialize
const initialize = async () => {
    // Code!

    // Get Queue from Device
    // Remember: getting queue from device is always synchronous
    queue = device.queue;

    console.log("WebGPU Queue Obtained Successfully!!..");

    // Get WebGPU context from canvas element
    context = canvas.getContext("webgpu");
    if(!context){
        console.log("Failed to get WebGPU Context!");
        throw Error("Failed to get WebGPU Context!");
    }
    else {
        console.log("WebGPU Context Obtained Successfully!!..");
    }
    
    // Get preferred canvas format
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    //configure the canvas by using obtained format to become functionable and suit our needs
    const canvasConfiguration = {
        device: device,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: "opaque"
    };
    context.configure(canvasConfiguration);
    console.log("WebGPU Context Configured with Format:", canvasFormat);

    //teapot

    // Write vertex shader code in WGSL [WGSL is stricly typed, with no implicit type conversions or promotions]
    const teapotVertexShaderSourceCode = `
        struct VertexOutput {
            @builtin(position) Position: vec4<f32>,
            @location(0) t_normal: vec3<f32>,
            @location(1) lightDirection: vec3<f32>,
            @location(2) viewerVector: vec3<f32>,
            @location(3) texcoord: vec2<f32>,
        };

        struct Uniforms_fbo {
            modelMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
            lightPosition: vec4<f32>,
            lightAmbient: vec4<f32>,
            lightDiffuse: vec4<f32>,
            lightSpecular: vec4<f32>,
            materialAmbient: vec4<f32>,
            materialDiffuse: vec4<f32>,
            materialSpecular: vec4<f32>,
            materialShininess: vec4<f32>,
            keyFlags: vec4<u32>
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms_fbo;


        fn mat3FromMat4(m:mat4x4<f32>)->mat3x3<f32> {
            return(mat3x3<f32>(m[0].xyz, m[1].xyz, m[2].xyz));
        }

        fn inverse3x3(m:mat3x3<f32>)->mat3x3<f32>{
            let determinant = m[0][0] * (m[1][1]*m[2][2] - m[2][1]*m[1][2]) - 
                            m[1][0] * (m[0][1]*m[2][2] - m[2][1]*m[0][2]) + 
                            m[2][0] * (m[0][1]*m[1][2] - m[1][1]*m[0][2]);
            let inverse_determinant = 1.0 / determinant;
            let column0 = vec3<f32>
            (
                (m[1][1]*m[2][2] - m[2][1]*m[1][2]) * inverse_determinant,
                (m[2][1]*m[0][2] - m[0][1]*m[2][2]) * inverse_determinant,
                (m[0][1]*m[1][2] - m[1][1]*m[0][2]) * inverse_determinant
            );
            let column1 = vec3<f32>
            (
                (m[2][0]*m[1][2] - m[1][0]*m[2][2]) * inverse_determinant,
                (m[0][0]*m[2][2] - m[2][0]*m[0][2]) * inverse_determinant,
                (m[1][0]*m[0][2] - m[0][0]*m[1][2]) * inverse_determinant
            );
            let column2 = vec3<f32>
            (
                (m[1][0]*m[2][1] - m[2][0]*m[1][1]) * inverse_determinant,
                (m[2][0]*m[0][1] - m[0][0]*m[2][1]) * inverse_determinant,
                (m[0][0]*m[1][1] - m[1][0]*m[0][1]) * inverse_determinant
            );
            return(mat3x3<f32>(column0, column1, column2));
        }

        @vertex fn main(@location(0) pos: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) texcoord: vec2<f32>) -> VertexOutput {
            var output: VertexOutput;

            if(uniforms.keyFlags.x == 1u) {
                let eyeCoords: vec4<f32> = uniforms.viewMatrix * uniforms.modelMatrix * vec4<f32>(pos, 1.0);
                let modelViewMatrix: mat3x3<f32> = mat3FromMat4(uniforms.viewMatrix * uniforms.modelMatrix);
                let normalMatrix: mat3x3<f32> = transpose(inverse3x3(modelViewMatrix));
                let t_normal: vec3<f32> = normalMatrix * normal;
                let lightDirection: vec3<f32> = uniforms.lightPosition.xyz - eyeCoords.xyz;
                let viewerVector: vec3<f32> = -eyeCoords.xyz;

                output.t_normal = t_normal;
                output.lightDirection = lightDirection;
                output.viewerVector = viewerVector;
            }

            output.texcoord = texcoord;

            output.Position = uniforms.projectionMatrix * uniforms.viewMatrix * uniforms.modelMatrix * vec4<f32>(pos, 1.0);

            return output;
        }
    `;

    // Create Vertex shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_vertex_teapot = {
        code: teapotVertexShaderSourceCode,
    };

    // Create Vertex Shader Module from Descriptor //! GPUShaderModule
    const vertexShaderModule_teapot = device.createShaderModule(shaderModuleDescriptor_vertex_teapot);
    if(!vertexShaderModule_teapot){
        console.log("Failed to create Vertex Shader Module for teapot!");
        throw Error("Failed to create Vertex Shader Module for teapot!");
    } else {
        console.log("Vertex Shader Module Created Successfully for teapot!");
    }

    // Write fragment shader code in WGSL
    const teapotFragmentShaderSourceCode = `
        struct VertexOutput {
            @builtin(position) Position: vec4<f32>,
            @location(0) t_normal: vec3<f32>,
            @location(1) lightDirection: vec3<f32>,
            @location(2) viewerVector: vec3<f32>,
            @location(3) texcoord: vec2<f32>,
        };

        struct Uniforms_fbo {
            modelMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            projectionMatrix: mat4x4<f32>,
            lightPosition: vec4<f32>,
            lightAmbient: vec4<f32>,
            lightDiffuse: vec4<f32>,
            lightSpecular: vec4<f32>,
            materialAmbient: vec4<f32>,
            materialDiffuse: vec4<f32>,
            materialSpecular: vec4<f32>,
            materialShininess: vec4<f32>,
            keyFlags: vec4<u32>
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms_fbo;
        @group(1) @binding(0) var my_marble_texture_2d: texture_2d<f32>;
        @group(1) @binding(1) var my_marble_sampler: sampler;

        @fragment fn main(input: VertexOutput) -> @location(0) vec4<f32> {
            var phong_ads_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

            if(uniforms.keyFlags.x == 1u && uniforms.keyFlags.y == 1u) {
                let n_tNormal: vec3<f32> = normalize(input.t_normal);
                let n_lightDirection: vec3<f32> = normalize(input.lightDirection);
                let n_viewerVector: vec3<f32> = normalize(input.viewerVector);

                let tn_dot_ld: f32 = max(dot(n_tNormal, n_lightDirection), 0.0);
                let reflectionVector: vec3<f32> = reflect(-n_lightDirection, n_tNormal);
                let specularHighlight: f32 = pow(max(dot(reflectionVector, n_viewerVector), 0.0), uniforms.materialShininess.x);
                let textureColor: vec4<f32> = textureSample(my_marble_texture_2d, my_marble_sampler, input.texcoord);

                let ambient: vec3<f32> = (uniforms.lightAmbient.xyz * uniforms.materialAmbient.xyz * textureColor.xyz);
                let diffuse: vec3<f32> = (uniforms.lightDiffuse.xyz * uniforms.materialDiffuse.xyz * tn_dot_ld * textureColor.xyz);
                let specular: vec3<f32> = (uniforms.lightSpecular.xyz * uniforms.materialSpecular.xyz) * specularHighlight;
                phong_ads_light = ambient + diffuse + specular;

            } else if(uniforms.keyFlags.x == 1u && uniforms.keyFlags.y == 0u) {
                let n_tNormal: vec3<f32> = normalize(input.t_normal);
                let n_lightDirection: vec3<f32> = normalize(input.lightDirection);
                let n_viewerVector: vec3<f32> = normalize(input.viewerVector);

                let tn_dot_ld: f32 = max(dot(n_tNormal, n_lightDirection), 0.0);
                let reflectionVector: vec3<f32> = reflect(-n_lightDirection, n_tNormal);
                let specularHighlight: f32 = pow(max(dot(reflectionVector, n_viewerVector), 0.0), uniforms.materialShininess.x);

                let ambient: vec3<f32> = (uniforms.lightAmbient.xyz * uniforms.materialAmbient.xyz);
                let diffuse: vec3<f32> = (uniforms.lightDiffuse.xyz * uniforms.materialDiffuse.xyz * tn_dot_ld);
                let specular: vec3<f32> = (uniforms.lightSpecular.xyz * uniforms.materialSpecular.xyz) * specularHighlight;
                phong_ads_light = ambient + diffuse + specular;

            } else if(uniforms.keyFlags.x == 0u && uniforms.keyFlags.y == 1u) {
                phong_ads_light = textureSample(my_marble_texture_2d, my_marble_sampler, input.texcoord).xyz;
            } else {
                phong_ads_light = vec3<f32>(1.0, 1.0, 1.0);
            }

            return vec4<f32>(phong_ads_light, 1.0);
        }
    `;

    // Create Fragment shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_fragment_teapot = {
        code: teapotFragmentShaderSourceCode,
    };

    // Create Fragment Shader Module from Descriptor //! GPUShaderModule
    const fragmentShaderModule_teapot = device.createShaderModule(shaderModuleDescriptor_fragment_teapot);
    if(!fragmentShaderModule_teapot){
        console.log("Failed to create Fragment Shader Module for Teapot!");
        throw Error("Failed to create Fragment Shader Module for Teapot!");
    } else {
        console.log("Fragment Shader Module Created Successfully for Teapot!");
    }

    // Cube
    const vertexShaderSourceCode_cube = `
        struct MVPUniform {
            mvpMatrix: mat4x4<f32>
        };

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) texcoord: vec2<f32>,
        };

        @group(0) @binding(0) var<uniform> mvpUniform: MVPUniform;

        @vertex fn main(@location(0) pos: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
            var output: VertexOutput;
            output.position = mvpUniform.mvpMatrix * pos;
            output.texcoord = uv;
            return output;
        }
    `;

    // Create Vertex shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_vertex_cube = {
        code: vertexShaderSourceCode_cube,
    };

    // Create Vertex Shader Module from Descriptor //! GPUShaderModule
    const vertexShaderModule_cube = device.createShaderModule(shaderModuleDescriptor_vertex_cube);
    if(!vertexShaderModule_cube){
        console.log("Failed to create Vertex Shader Module for Cube!");
        throw Error("Failed to create Vertex Shader Module for Cube!");
    } else {
        console.log("Vertex Shader Module Created Successfully for Cube!");
    }

    const fragmentShaderSourceCode_cube = `
        @group(1) @binding(0) var my_teapot_texture_2d: texture_2d<f32>;
        @group(1) @binding(1) var my_teapot_sampler: sampler;

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) texcoord: vec2<f32>,
        };

        @fragment fn main(output: VertexOutput) -> @location(0) vec4<f32> {
            var color = textureSample(my_teapot_texture_2d, my_teapot_sampler, output.texcoord);
            return color;
        }
    `;

    // Create Fragment shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_fragment_cube = {
        code: fragmentShaderSourceCode_cube,
    };

    // Create Fragment Shader Module from Descriptor //! GPUShaderModule
    const fragmentShaderModule_cube = device.createShaderModule(shaderModuleDescriptor_fragment_cube);
    if(!fragmentShaderModule_cube){
        console.log("Failed to create Fragment Shader Module for Cube!");
        throw Error("Failed to create Fragment Shader Module for Cube!");
    } else {
        console.log("Fragment Shader Module Created Successfully for Cube!");
    }

    //Create Teapot Mesh
    const teapot = new Mesh();
    teapot.allocate(teapotVertexCount);

    const startTime = performance.now();

    for (let i = 0; i < teapotVertexCount; i = i + 3) {
        const single_vertex = [[
            teapotPositions[(i + 0) * 3 + 0],
            teapotPositions[(i + 0) * 3 + 1],
            teapotPositions[(i + 0) * 3 + 2]
        ],
        [
            teapotPositions[(i + 1) * 3 + 0],
            teapotPositions[(i + 1) * 3 + 1],
            teapotPositions[(i + 1) * 3 + 2]
        ],
        [
            teapotPositions[(i + 2) * 3 + 0],
            teapotPositions[(i + 2) * 3 + 1],
            teapotPositions[(i + 2) * 3 + 2]
        ]];

        const single_normal = [[
            teapotNormals[(i + 0) * 3 + 0],
            teapotNormals[(i + 0) * 3 + 1],
            teapotNormals[(i + 0) * 3 + 2]
        ],
        [
            teapotNormals[(i + 1) * 3 + 0],
            teapotNormals[(i + 1) * 3 + 1],
            teapotNormals[(i + 1) * 3 + 2]
        ],
        [
            teapotNormals[(i + 2) * 3 + 0],
            teapotNormals[(i + 2) * 3 + 1],
            teapotNormals[(i + 2) * 3 + 2]
        ]];

        const single_texcoord = [[
            teapotTexCoords[(i + 0) * 2 + 0],
            teapotTexCoords[(i + 0) * 2 + 1]
        ],
        [
            teapotTexCoords[(i + 1) * 2 + 0],
            teapotTexCoords[(i + 1) * 2 + 1]
        ],
        [
            teapotTexCoords[(i + 2) * 2 + 0],
            teapotTexCoords[(i + 2) * 2 + 1]
        ]];

        teapot.addTriangle(single_vertex, single_normal, single_texcoord);
    }

    numMeshIndices = teapot.getIndexCount();


    console.log("Teapot Mesh Created", "Num Elements:", numMeshIndices, "Num Vertices:", teapotVertexCount);

    const teapotMeshData = teapot.getMeshData();

    // create vertex buffer data for position, normal, texcoord and element

    buffer_teapot_position = createVertexBuffer(teapotMeshData.verticesArray);
    if(!buffer_teapot_position){
        console.log("Failed to create Position Buffer for Teapot!");
        throw Error("Failed to create Position Buffer for Teapot!");
    } else {
        console.log("Position Buffer Created Successfully for Teapot!!..");
    }

    buffer_teapot_normal = createVertexBuffer(teapotMeshData.normalsArray);
    if(!buffer_teapot_normal){
        console.log("Failed to create Normal Buffer for Teapot!");
        throw Error("Failed to create Normal Buffer for Teapot!");
    } else {
        console.log("Normal Buffer Created Successfully for Teapot!!..");
    }

    buffer_teapot_texcoord = createVertexBuffer(teapotMeshData.texCoordsArray);
    if(!buffer_teapot_texcoord){
        console.log("Failed to create Texcoord Buffer for Teapot!");
        throw Error("Failed to create Texcoord Buffer for Teapot!");
    } else {
        console.log("Texcoord Buffer Created Successfully for Teapot!!..");
    }

    buffer_teapot_element = createIndexBuffer(teapotMeshData.indicesArray);
    if(!buffer_teapot_element){
        console.log("Failed to create Element Buffer for Teapot!");
        throw Error("Failed to create Element Buffer for Teapot!");
    } else {
        console.log("Element Buffer Created Successfully for Teapot!!..");
    }

    // Cube Geometry!
    // Declare Position Array
    const cube_vertex_position = new Float32Array([
        
        // front
        1.0,  1.0,  1.0, // top-right of front
        -1.0,  1.0,  1.0, // top-left of front
        -1.0, -1.0,  1.0, // bottom-left of front

        -1.0, -1.0,  1.0, // bottom-left of front
        1.0, -1.0,  1.0, // bottom-right of front
        1.0,  1.0,  1.0, // top-right of front

        // right
        1.0,  1.0, -1.0, // top-right of right
        1.0,  1.0,  1.0, // top-left of right
        1.0, -1.0,  1.0, // bottom-left of right
        
        1.0, -1.0,  1.0, // bottom-left of right
        1.0, -1.0, -1.0, // bottom-right of right
        1.0,  1.0, -1.0, // top-right of right

        // back
        1.0,  1.0, -1.0, // top-right of back
        -1.0,  1.0, -1.0, // top-left of back
        -1.0, -1.0, -1.0, // bottom-left of back

        -1.0, -1.0, -1.0, // bottom-left of back
        1.0, -1.0, -1.0, // bottom-right of back
        1.0,  1.0, -1.0, // top-right of back

        // left
        -1.0,  1.0,  1.0, // top-right of left
        -1.0,  1.0, -1.0, // top-left of left
        -1.0, -1.0, -1.0, // bottom-left of left

        -1.0, -1.0, -1.0, // bottom-left of left
        -1.0, -1.0,  1.0, // bottom-right of left
        -1.0,  1.0,  1.0, // top-right of left

        // top
        1.0,  1.0, -1.0, // top-right of top
        -1.0,  1.0, -1.0, // top-left of top
        -1.0,  1.0,  1.0, // bottom-left of top

        -1.0,  1.0,  1.0, // bottom-left of top
        1.0,  1.0,  1.0, // bottom-right of top
        1.0,  1.0, -1.0, // top-right of top

        // bottom
        1.0, -1.0,  1.0, // top-right of bottom
        -1.0, -1.0,  1.0, // top-left of bottom
        -1.0, -1.0, -1.0, // bottom-left of bottom

        -1.0, -1.0, -1.0, // bottom-left of bottom
        1.0, -1.0, -1.0, // bottom-right of bottom
        1.0, -1.0,  1.0, // top-right of bottom
    ]);

    const cube_vertex_texCoords = new Float32Array([
        1.0, 1.0, // top-right of front
        0.0, 1.0, // top-left of front
        0.0, 0.0, // bottom-left of front

        0.0, 0.0, // bottom-left of front
        1.0, 0.0, // bottom-right of front
        1.0, 1.0, // top-right of front

        // right
        1.0, 1.0, // top-right of right
        0.0, 1.0, // top-left of right
        0.0, 0.0, // bottom-left of right

        0.0, 0.0, // bottom-left of right
        1.0, 0.0, // bottom-right of right
        1.0, 1.0, // top-right of right

        // back
        1.0, 1.0, // top-right of back
        0.0, 1.0, // top-left of back
        0.0, 0.0, // bottom-left of back

        0.0, 0.0, // bottom-left of back
        1.0, 0.0, // bottom-right of back
        1.0, 1.0, // top-right of back

        // left
        1.0, 1.0, // top-right of left
        0.0, 1.0, // top-left of left
        0.0, 0.0, // bottom-left of left

        0.0, 0.0, // bottom-left of left
        1.0, 0.0, // bottom-right of left
        1.0, 1.0, // top-right of left

        // top
        1.0, 1.0, // top-right of top
        0.0, 1.0, // top-left of top
        0.0, 0.0, // bottom-left of top

        0.0, 0.0, // bottom-left of top
        1.0, 0.0, // bottom-right of top
        1.0, 1.0, // top-right of top

        // bottom
        1.0, 1.0, // top-right of bottom
        0.0, 1.0, // top-left of bottom
        0.0, 0.0, // bottom-left of bottom

        0.0, 0.0, // bottom-left of bottom
        1.0, 0.0, // bottom-right of bottom
        1.0, 1.0, // top-right of bottom
    ]);

    buffer_cube_position = createVertexBuffer(cube_vertex_position);
    if(!buffer_cube_position){
        console.log("Failed to create Position Buffer for Cube!");
        throw Error("Failed to create Position Buffer for Cube!");
    } else {
        console.log("Position Buffer Created Successfully for Cube!!..");
    }

    buffer_cube_texcoord = createVertexBuffer(cube_vertex_texCoords);
    if(!buffer_cube_texcoord){
        console.log("Failed to create Texcoord Buffer for Cube!");
        throw Error("Failed to create Texcoord Buffer for Cube!");
    } else {
        console.log("Texcoord Buffer Created Successfully for Cube!!..");
    }

    // Marble Texture
    texture_marble = await loadTexture("Marble.png");
    if(!texture_marble){
        console.log("Failed to create Marble Texture!");
        throw Error("Failed to create Marble Texture!");
    } else {
        console.log("Marble Texture Created Successfully!!..");
    }

    // FBO Texture
    // remember this tex will not hv any image but here teapot will render as testure of cube
    // this is a precedural texture so we can't use loadTexture() function to load it from image file
    const teapotColorTextureDescriptor = {
        size: [FBO_WIDTH, FBO_HEIGHT],
        dimension: "2d",
        format: "rgba8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    };

    texture_teapot_color = device.createTexture(teapotColorTextureDescriptor);
    if(!texture_teapot_color){
        console.log("Failed to create Teapot Color Texture!");
        throw Error("Failed to create Teapot Color Texture!");
    } else {
        console.log("Teapot Color Texture Created Successfully!!..");
    }

    // Teapot Depth Texture
    const teapotDepthTextureDescriptor = {
        size: [FBO_WIDTH, FBO_HEIGHT],
        dimension: "2d",
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    };

    texture_teapot_depth = device.createTexture(teapotDepthTextureDescriptor);
    if(!texture_teapot_depth){
        console.log("Failed to create Teapot Depth Texture!");
        throw Error("Failed to create Teapot Depth Texture!");
    } else {
        console.log("Teapot Depth Texture Created Successfully!!..");
    }

    const samplerDescriptor_marble = {
        magFilter: "linear",
        minFilter: "linear",
    };

    // Create Sampler from Descriptor //! GPUSampler
    sampler_marble = device.createSampler(samplerDescriptor_marble);
    if(!sampler_marble){
        console.log("Failed to create Sampler for Marble Texture!");
        throw Error("Failed to create Sampler for Marble Texture!");
    }
    else {
        console.log("Sampler Created Successfully for Marble Texture!!..");
    }

    // Create Sampler for Teapot Color Texture
    const samplerDescriptor_teapot_color = {
        magFilter: "linear",
        minFilter: "linear",
    };

    // Create Sampler from Descriptor //! GPUSampler
    sampler_teapot = device.createSampler(samplerDescriptor_teapot_color);
    if(!sampler_teapot){
        console.log("Failed to create Sampler for Teapot Color Texture!");
        throw Error("Failed to create Sampler for Teapot Color Texture!");
    }
    else {
        console.log("Sampler Created Successfully for Teapot Color Texture!!..");
    }

    // Teapot Uniform
    let teapotUniformSize = (Float32Array.BYTES_PER_ELEMENT * 16) * 3; // 4x4 matrix of 32-bit floats = 16 * 4 bytes = for model, view, projection matrices
    teapotUniformSize += (Float32Array.BYTES_PER_ELEMENT * 4) * 8; // 4x4 vector of 32-bit floats = 4 * 4 bytes = for light position, ambient, diffuse, specular, material ambient, diffuse, specular, shininess
    teapotUniformSize += (Uint32Array.BYTES_PER_ELEMENT * 4); // 4x1 vector of 32-bit unsigned integers = 4 * 4 bytes = for lKeyPressed

    buffer_uniform_teapot = createUniformBuffer(teapotUniformSize, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Cube Uniform
    let cubeUniformSize = (Float32Array.BYTES_PER_ELEMENT * 16); 

    buffer_uniform_cube = createUniformBuffer(cubeUniformSize, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Teapot Bind Group Layout
    const bindGroupLayout_uniform_teapot = createBindGroupLayoutUniform(0, GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, "uniform");

    // Cube Bind Group Layout
    const bindGroupLayout_uniform_cube = createBindGroupLayoutUniform(0, GPUShaderStage.VERTEX, "uniform");

    // Create Bind Group Layout for Teapot Texture and Sampler
    const bindGroupLayout_texture_sampler = createBindGroupLayoutForTextureAndSampler(
        "float",
        "2d",
        false,
        0,
        GPUShaderStage.FRAGMENT,
        "filtering",
        1,
        GPUShaderStage.FRAGMENT
    );

    // as both have linear filtering, 
    // we can use same bind group layout for both marble and teapot color texture and sampler

    // create Bind Group for Teapot Uniform Buffer
    bindingGroup_uniform_teapot = createBindGroupForUniform(buffer_uniform_teapot, 0, teapotUniformSize, 0, bindGroupLayout_uniform_teapot);

    // create Bind Group for MVP Uniform Buffer
    bindingGroup_uniform_cube = createBindGroupForUniform(buffer_uniform_cube, 0, cubeUniformSize, 0, bindGroupLayout_uniform_cube);

    bindingGroup_marble_texture_sampler_teapot = createBindGroupForTextureAndSampler(
        0,
        texture_marble,
        1,
        sampler_marble,
        bindGroupLayout_texture_sampler
    );

    bindingGroup_teapot_texture_sampler_cube = createBindGroupForTextureAndSampler(
        0,
        texture_teapot_color,
        1,
        sampler_teapot,
        bindGroupLayout_texture_sampler
    );

    // create pipeline layout descriptor //! GPUPipelineLayoutDescriptor
    const pipelineLayoutDescriptor_teapot = {
        bindGroupLayouts: [bindGroupLayout_uniform_teapot, bindGroupLayout_texture_sampler],
    };

    // create pipeline layout from descriptor //! GPUPipelineLayout
    const pipelineLayout_teapot = device.createPipelineLayout(pipelineLayoutDescriptor_teapot);
    if(!pipelineLayout_teapot){
        console.log("Failed to create Pipeline Layout for Teapot!");
        throw Error("Failed to create Pipeline Layout for Teapot!");
    }
    else {
        console.log("Pipeline Layout Created Successfully for Teapot!!..");
    }

    const pipelineLayoutDescriptor_cube = {
        bindGroupLayouts: [bindGroupLayout_uniform_cube, bindGroupLayout_texture_sampler],
    };

    // create pipeline layout from descriptor //! GPUPipelineLayout
    const pipelineLayout_cube = device.createPipelineLayout(pipelineLayoutDescriptor_cube);
    if(!pipelineLayout_cube){
        console.log("Failed to create Pipeline Layout for Cube!");
        throw Error("Failed to create Pipeline Layout for Cube!");
    }
    else {
        console.log("Pipeline Layout Created Successfully for Cube!!..");
    }

    // create vertex attribute for position //! GPUVertexAttribute
    const positionVertexAttribute = { // Shared between teapot and cube
        shaderLocation: 0, // this matches the @location(0) in the shader code
        offset: 0,
        format: "float32x3", // this is a vec3<f32>
    };

    // create vertex attribute for normal //! GPUVertexAttribute
    const normalVertexAttribute = { // Shared between teapot and cube
        shaderLocation: 1, // this matches the @location(1) in the shader code
        offset: 0,
        format: "float32x3", // this is a vec3<f32>
    };

    // create vertex attribute for texcoord //! GPUVertexAttribute
    const texcoordVertexAttribute_teapot = {
        shaderLocation: 2, // this matches the @location(2) in the shader code
        offset: 0,
        format: "float32x2", // this is a vec2<f32>
    };

    const texcoordVertexAttribute_cube = { //! GPUVertexAttribute
        shaderLocation: 1, // this matches the @location(1) in the shader code
        offset: 0,
        format: "float32x2", // this is a vec2<f32>
    };

    // create vertex buffer layout for position //! GPUVertexBufferLayout
    const positionVertexBufferLayout = { // Shared between teapot and cube
        attributes: [positionVertexAttribute],
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3, // 3 floats * 4 bytes = 12 bytes [ 4 * 3 would works toom but this more accurate ]
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    const normalVertexBufferLayout = { // onkly for teapot
        attributes: [normalVertexAttribute],
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3, // 3 floats * 4 bytes = 12 bytes [ 4 * 3 would works toom but this more accurate ]
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    const texcoordVertexBufferLayout_teapot = {
        attributes: [texcoordVertexAttribute_teapot],
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 2, // 2 floats * 4 bytes = 8 bytes [ 4 * 2 would works toom but this more accurate ]
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    const texcoordVertexBufferLayout_cube = {
        attributes: [texcoordVertexAttribute_cube],
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 2, // 2 floats * 4 bytes = 8 bytes [ 4 * 2 would works toom but this more accurate ]
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    // create vertex state //! GPUVertexState
    const vertexShaderState_teapot = {
        module: vertexShaderModule_teapot,
        entryPoint: "main",
        buffers: [positionVertexBufferLayout, normalVertexBufferLayout, texcoordVertexBufferLayout_teapot],
    };

    const vertexShaderState_cube = {
        module: vertexShaderModule_cube,
        entryPoint: "main",
        buffers: [positionVertexBufferLayout, texcoordVertexBufferLayout_cube],
    };

    // Fragment State
    // color target state //! GPUColorTargetState
    const colorTargetState_teapot = {
        format: "rgba8unorm", // this is the format of the texture we are rendering to
    };

    const colorTargetState_cube = {
        format: canvasFormat, // this is the format of the canvas we are rendering to
    };

    // create fragment state //! GPUFragmentState
    const fragmentShaderState_teapot = {
        module: fragmentShaderModule_teapot,
        entryPoint: "main",
        targets: [colorTargetState_teapot],
    };

    const fragmentShaderState_cube = {
        module: fragmentShaderModule_cube,
        entryPoint: "main",
        targets: [colorTargetState_cube],
    };

    // create primitive state //! GPUPrimitiveState
    const primitiveState = { // Shared between teapot and cube
        frontFace: "cw", // clockwise front face
        cullMode: "none", // no culling
        topology: "triangle-list",
    };

    // Depth Stencil State //! GPUDepthStencilState
    const depthStencilState_teapot = { // must match teapot FBO depth texture format
        format: "depth32float",
        depthWriteEnabled: true,
        depthCompare: "less-equal", // GL_LEQUAL equivalent
    };

    const depthStencilState_cube = { // must match canvas depth texture format
        format: "depth24plus-stencil8", // without stencil buffer, we can use "depth24plus" or "depth32float"
        depthWriteEnabled: true,
        depthCompare: "less-equal", // GL_LEQUAL equivalent
    };

    // create render pipeline descriptor //! GPURenderPipelineDescriptor
    const renderPipelineDescriptor_teapot = {
        layout: pipelineLayout_teapot,
        vertex: vertexShaderState_teapot,
        fragment: fragmentShaderState_teapot,
        primitive: primitiveState,
        depthStencil: depthStencilState_teapot,
    };

    const renderPipelineDescriptor_cube = {
        layout: pipelineLayout_cube,
        vertex: vertexShaderState_cube,
        fragment: fragmentShaderState_cube,
        primitive: primitiveState,
        depthStencil: depthStencilState_cube,
    };

    // create render pipeline from descriptor //! GPURenderPipeline
    renderPipeline_teapot = device.createRenderPipeline(renderPipelineDescriptor_teapot);
    if(!renderPipeline_teapot){
        console.log("Failed to create Render Pipeline for teapot!");
        throw Error("Failed to create Render Pipeline for teapot!");
    }
    else {
        console.log("Render Pipeline Created Successfully for teapot!!..");
    }

    renderPipeline_cube = device.createRenderPipeline(renderPipelineDescriptor_cube);
    if(!renderPipeline_cube){
        console.log("Failed to create Render Pipeline for cube!");
        throw Error("Failed to create Render Pipeline for cube!");
    }
    else {
        console.log("Render Pipeline Created Successfully for cube!!..");
    }

    // initialize perspective projection matrix to identity
    perspectiveProjectionMatrix = mat4.create();
    perspectiveProjectionMatrix_fbo = mat4.create();

    // Set Clear Color
    clearColor = {r: 1.0, g: 1.0, b: 1.0, a: 1.0}; // white for cube
    clearColor_fbo = {r: 0.0, g: 0.0, b: 0.0, a: 1.0}; // black for teapot

    // set perspective projection matrix
    mat4.perspective(perspectiveProjectionMatrix_fbo, degToRad(45.0), FBO_WIDTH / FBO_HEIGHT, 0.1, 100);
}

// UDF

const createVertexBuffer = (_vertexData) => {
    // create vertex buffer descriptor //! GPUBufferDescriptor
    const bufferDescriptor = {
        size: _vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // create vertex buffer from descriptor //! GPUBuffer
    const vertexBuffer = device.createBuffer(bufferDescriptor);
    if(!vertexBuffer){
        return null;
    }

    // write data to vertex buffer
    queue.writeBuffer(vertexBuffer, 0, _vertexData, 0, _vertexData.length);

    return vertexBuffer;
}

const createIndexBuffer = (_indexData) => {
    // create index buffer descriptor //! GPUBufferDescriptor
    const bufferDescriptor = {
        size: _indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    };

    // create index buffer from descriptor //! GPUBuffer
    const indexBuffer = device.createBuffer(bufferDescriptor);
    if(!indexBuffer){
        return null;
    }

    // write data to index buffer
    queue.writeBuffer(indexBuffer, 0, _indexData, 0, _indexData.length);

    return indexBuffer;
}

const createBindGroupLayoutUniform = (_bindingIndex, _shaderStageVisibility, _uniformType) => {
    // Uniform Plumbing!
    // create bind group layout entry for mvp uniform buffer //! GPUBindGroupLayoutEntry
    const bindGroupLayoutEntry = {
        binding: _bindingIndex, // this matches the @binding(0) in the shader code
        visibility: _shaderStageVisibility, // this uniform is used in the vertex shader
        buffer: {
            type: _uniformType, // this is a uniform buffer
        },
    };

    // create bind group layout descriptor //! GPUBindGroupLayoutDescriptor
    const bindGroupLayoutDescriptor = {
        entries: [bindGroupLayoutEntry],
    };

    // create bind group layout from descriptor //! GPUBindGroupLayout
    const bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);
    if(!bindGroupLayout){
        console.log("Failed to create Bind Group Layout!");
        throw Error("Failed to create Bind Group Layout!");
    }
    else {
        console.log("Bind Group Layout Created Successfully!!..");
    }

    return bindGroupLayout;
}

const createUniformBuffer = (_uniformBufferSize, _uniformBufferUsage) => {
    // create uniform buffer descriptor //! GPUBufferDescriptor
    const bufferDescriptor = {
        size: _uniformBufferSize,
        usage: _uniformBufferUsage,
    };

    // create uniform buffer from descriptor //! GPUBuffer
    const uniformBuffer = device.createBuffer(bufferDescriptor);
    if(!uniformBuffer){
        console.log("Failed to create Uniform Buffer!");
        throw Error("Failed to create Uniform Buffer!");
    }
    else {
        console.log("Uniform Buffer Created Successfully!!..");
    }

    return uniformBuffer;
}

const createBindGroupForUniform = (_uniformBuffer, _uniformBufferOffset, _uniformBufferSize, _bindingIndex, _bindGroupLayout) => {
    // create buffer binding for mvp uniform buffer //! GPUBufferBinding
    const bufferBinding = {
        buffer: _uniformBuffer,
        offset: _uniformBufferOffset,
        size: _uniformBufferSize,
    };

    // create bind group entry for mvp uniform buffer //! GPUBindGroupEntry
    const bindGroupEntry = {
        binding: _bindingIndex, // this matches the @group(0) in the shader code
        resource: bufferBinding,
    };

    // create bind group descriptor //! GPUBindGroupDescriptor
    const bindGroupDescriptor = {
        layout: _bindGroupLayout,
        entries: [bindGroupEntry],
    };

    // create bind group from descriptor //! GPUBindGroup
    const bindGroup = device.createBindGroup(bindGroupDescriptor);
    if(!bindGroup){
        console.log("Failed to create Bind Group!");
        throw Error("Failed to create Bind Group!");
    }
    else {
        console.log("Bind Group Created Successfully!!..");
    }

    return bindGroup;
}

// UDF for Texture and Sampler
const loadTexture = async (_imageFileName) => {

    // Load the image
    const image = new Image();
    image.src = _imageFileName;
    await image.decode();

    const imageBitmap = await createImageBitmap(image);
    if(!imageBitmap){
        console.log("Failed to create Image Bitmap!");
        throw Error("Failed to create Image Bitmap!");
    }
    else {
        console.log("Image Bitmap Created Successfully!!..");
    }

    // Create Texture Descriptor //! GPUTextureDescriptor
    const textureDescriptor = {
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    };

    // Create Texture from Descriptor //! GPUTexture
    const _texture = device.createTexture(textureDescriptor);
    if(!_texture){
        console.log("Failed to create Texture!");
        throw Error("Failed to create Texture!");
    }
    else {
        console.log("Texture Created Successfully!!..");
    }

    const copySource = {
        source: imageBitmap,
        // flipY: true, -- Other way to flip the image vertically
    };

    const copyDestination = {
        texture: _texture,
        mipLevel: 0,
    };

    // Copy Image Bitmap to Texture
    device.queue.copyExternalImageToTexture(
        copySource,
        copyDestination,
        textureDescriptor.size
    );

    console.log("Image Bitmap Copied to Texture Successfully!!..");     

    return _texture;
}

const createBindGroupLayoutForTextureAndSampler = (
    _textureSampleType, _textureViewDimension,
    _isTextureMultisampled, _textureBindingIndex,
    _textureShaderStageVisibility, _samplerType,
    _samplerBindingIndex, _samplerShaderStageVisibility
) => {

    // Code
    // Creating Binding Layout for Texture
    const bindingLayout_texture = {
        sampleType: _textureSampleType,
        viewDimension: _textureViewDimension,
        multisampled: _isTextureMultisampled,
    }

    // Create Bind Group Layout Entry for Texture //! GPUBindGroupLayoutEntry
    const bindGroupLayoutEntry_texture = {
        binding: _textureBindingIndex,
        visibility: _textureShaderStageVisibility,
        texture: bindingLayout_texture
    }

    // Creating Binding Layout for Sampler
    const bindingLayout_sampler = {
        type: _samplerType
    }

    // Create Bind Group Layout Entry for Sampler //! GPUBindGroupLayoutEntry
    const bindGroupLayoutEntry_sampler = {
        binding: _samplerBindingIndex,
        visibility: _samplerShaderStageVisibility,
        sampler: bindingLayout_sampler
    }

    // Create Bind Group Layout Descriptor //! GPUBindGroupLayoutDescriptor
    const bindGroupLayoutDescriptor = {
        entries: [bindGroupLayoutEntry_texture, bindGroupLayoutEntry_sampler]
    }

    // Create Bind Group Layout from Descriptor //! GPUBindGroupLayout
    const bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);
    if(!bindGroupLayout){
        console.log("Failed to create Bind Group Layout for Texture and Sampler!");
        throw Error("Failed to create Bind Group Layout for Texture and Sampler!");
    }
    else {
        console.log("Bind Group Layout for Texture and Sampler Created Successfully!!..");
    }

    return bindGroupLayout;
}

const createBindGroupForTextureAndSampler = (
    _textureBindingIndex, _texture, _samplerBindingIndex, _sampler, _bindGroupLayout
) => {
    // Code
    // Create Bind Group Entry for Texture //! GPUBindGroupEntry
    const bindGroupEntry_texture = {
        binding: _textureBindingIndex,
        resource: _texture.createView()
    }

    // Create Bind Group Entry for Sampler //! GPUBindGroupEntry
    const bindGroupEntry_sampler = {
        binding: _samplerBindingIndex,
        resource: _sampler
    }

    // Create Bind Group Descriptor //! GPUBindGroupDescriptor
    const bindGroupDescriptor = {
        layout: _bindGroupLayout,
        entries: [bindGroupEntry_texture, bindGroupEntry_sampler]
    }
    
    // Create Bind Group from Descriptor //! GPUBindGroup   
    const bindGroup = device.createBindGroup(bindGroupDescriptor);
    if(!bindGroup){
        console.log("Failed to create Bind Group for Texture and Sampler!");
        throw Error("Failed to create Bind Group for Texture and Sampler!");
    }
    else {
        console.log("Bind Group for Texture and Sampler Created Successfully!!..");
    }
    
    return bindGroup;
}

const resize = () => {
    if(bFullScreen === true) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvasOriginalWidth;
        canvas.height = canvasOriginalHeight;
    }

    if(device !== null) {
        if(depthTexture !== null) {
            depthTexture.destroy();
            depthTexture = null;
        }

        // Depth Texture for Depth Buffer
        const depthTextureDescriptor = {
            size: [canvas.width, canvas.height],
            dimension: "2d",
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        };

        depthTexture = device.createTexture(depthTextureDescriptor);
        if(!depthTexture){
            console.log("Failed to create Depth Texture!");
            throw Error("Failed to create Depth Texture!");
        }
    }

    // Update Perspective Projection Matrix
    const aspectRatio = parseFloat(canvas.width) / parseFloat(canvas.height);
    mat4.perspective(perspectiveProjectionMatrix, degToRad(45.0), aspectRatio, 0.1, 100.0);
}

const display = () => {
    //Code
    // Device maybe lost, initialize maybe not done
    if(device === null){
        return;
    }

    // Get Command Encoder from Device, due to async nature of WebGPU, 
    // we will get command encoder in display function, not in initialize function
    const commandEncoder = device.createCommandEncoder();
    if(!commandEncoder){
        console.log("Failed to get Command Encoder!");
        throw Error("Failed to get Command Encoder!");
    }


    // Transformations - teapot
    var modelMatrix_teapot = mat4.create();
    var viewMatrix_teapot = mat4.create();

    mat4.translate(modelMatrix_teapot, modelMatrix_teapot, [0.0, 0.0, -1.5]);
    mat4.rotateY(modelMatrix_teapot, modelMatrix_teapot, degToRad(angle_teapot));

    keyFlags[0] = bLighting ? 1 : 0; // lKeyPressed - for lighting
    keyFlags[1] = bTexture ? 1 : 0;  // tKeyPressed - for texture

    // Write data to MVP Uniform Buffer - teapot
    queue.writeBuffer(buffer_uniform_teapot, 0, modelMatrix_teapot, 0, modelMatrix_teapot.length);
    queue.writeBuffer(buffer_uniform_teapot, 64, viewMatrix_teapot, 0, viewMatrix_teapot.length);
    queue.writeBuffer(buffer_uniform_teapot, 128, perspectiveProjectionMatrix_fbo, 0, perspectiveProjectionMatrix_fbo.length);
    queue.writeBuffer(buffer_uniform_teapot, 192, lightPosition, 0, lightPosition.length);
    queue.writeBuffer(buffer_uniform_teapot, 208, lightAmbient, 0, lightAmbient.length);
    queue.writeBuffer(buffer_uniform_teapot, 224, lightDiffuse, 0, lightDiffuse.length);
    queue.writeBuffer(buffer_uniform_teapot, 240, lightSpecular, 0, lightSpecular.length);
    queue.writeBuffer(buffer_uniform_teapot, 256, materialAmbient, 0, materialAmbient.length);
    queue.writeBuffer(buffer_uniform_teapot, 272, materialDiffuse, 0, materialDiffuse.length);
    queue.writeBuffer(buffer_uniform_teapot, 288, materialSpecular, 0, materialSpecular.length);
    queue.writeBuffer(buffer_uniform_teapot, 304, materialShininess, 0, materialShininess.length);
    queue.writeBuffer(buffer_uniform_teapot, 320, keyFlags, 0, keyFlags.length);


    // Cube Transformations
    var mvpMatrix_cube = mat4.create();

    mat4.translate(mvpMatrix_cube, mvpMatrix_cube, [0.0, 0.0, -5.0]);
    mat4.rotateY(mvpMatrix_cube, mvpMatrix_cube, degToRad(angle_cube));
    mat4.rotateX(mvpMatrix_cube, mvpMatrix_cube, degToRad(angle_cube));
    mat4.rotateZ(mvpMatrix_cube, mvpMatrix_cube, degToRad(angle_cube));
    mat4.multiply(mvpMatrix_cube, perspectiveProjectionMatrix, mvpMatrix_cube);

    // Write data to MVP Uniform Buffer - cube
    queue.writeBuffer(buffer_uniform_cube, 0, mvpMatrix_cube, 0, mvpMatrix_cube.length);
    // teapot render pass
    // Create Render Pass Color Attachment //! GPURenderPassColorAttachment
    const renderPassColorAttachment_teapot = {
        view: texture_teapot_color.createView(),
        clearValue: clearColor_fbo,
        loadOp: "clear",
        storeOp: "store"
    };

    // Create Render Pass Depth Stencil Attachment //! GPURenderPassDepthStencilAttachment
    const renderPassDepthStencilAttachment_teapot = {
        view: texture_teapot_depth.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store"
    };

    const renderPassDescriptor_teapot = {
        colorAttachments: [renderPassColorAttachment_teapot],
        depthStencilAttachment: renderPassDepthStencilAttachment_teapot
    };

    // Create Render Pass Encoder from Command Encoder //! GPURenderPassEncoder
    const renderPassEncoder_teapot = commandEncoder.beginRenderPass(renderPassDescriptor_teapot);
    if(!renderPassEncoder_teapot){
        console.log("Failed to get Render Pass Encoder!");
        throw Error("Failed to get Render Pass Encoder!");
    }

    renderPassEncoder_teapot.setPipeline(renderPipeline_teapot);
    renderPassEncoder_teapot.setViewport(0, 0, FBO_WIDTH, FBO_HEIGHT, 0, 1); // must be same as texture size, otherwise it will be stretched or shrunk
    renderPassEncoder_teapot.setScissorRect(0, 0, FBO_WIDTH, FBO_HEIGHT);

    renderPassEncoder_teapot.setVertexBuffer(0, buffer_teapot_position);
    renderPassEncoder_teapot.setVertexBuffer(1, buffer_teapot_normal);
    renderPassEncoder_teapot.setVertexBuffer(2, buffer_teapot_texcoord);
    renderPassEncoder_teapot.setIndexBuffer(buffer_teapot_element, "uint16");
    renderPassEncoder_teapot.setBindGroup(0, bindingGroup_uniform_teapot);
    renderPassEncoder_teapot.setBindGroup(1, bindingGroup_marble_texture_sampler_teapot);

    renderPassEncoder_teapot.drawIndexed(numMeshIndices);

    // End Render Pass
    renderPassEncoder_teapot.end();

    // Cube render pass
    const renderPassColorAttachment_cube = {
        view: context.getCurrentTexture().createView(),
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store"
    };

    const renderPassDepthStencilAttachment_cube = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store"
    };

    const renderPassDescriptor_cube = {
        colorAttachments: [renderPassColorAttachment_cube],
        depthStencilAttachment: renderPassDepthStencilAttachment_cube
    };

    const renderPassEncoder_cube = commandEncoder.beginRenderPass(renderPassDescriptor_cube);
    if(!renderPassEncoder_cube){
        console.log("Failed to get Render Pass Encoder!");
        throw Error("Failed to get Render Pass Encoder!");
    }

    renderPassEncoder_cube.setPipeline(renderPipeline_cube);
    renderPassEncoder_cube.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    renderPassEncoder_cube.setScissorRect(0, 0, canvas.width, canvas.height);

    renderPassEncoder_cube.setVertexBuffer(0, buffer_cube_position);
    renderPassEncoder_cube.setVertexBuffer(1, buffer_cube_texcoord);
    renderPassEncoder_cube.setBindGroup(0, bindingGroup_uniform_cube);
    renderPassEncoder_cube.setBindGroup(1, bindingGroup_teapot_texture_sampler_cube);

    renderPassEncoder_cube.draw(36, 1, 0, 0); // 36 vertices for cube

    // End Render Pass
    renderPassEncoder_cube.end();

    // Finish Command Encoder and submit Command Buffer to Queue for execution
    queue.submit([commandEncoder.finish()]);

    // Update Animation Angles
    update();

    // Animation Loop
    animationFrameId = requestAnimationFrame(display);
}

const update = () =>{
    // Code!

    if(bAnimation === true) {
        angle_teapot += 0.5;
        if(angle_teapot >= 360.0){
            angle_teapot = 0.0;
        }
    }
    

    angle_cube += 0.5;
    if(angle_cube >= 360.0){
        angle_cube = 0.0;
    }
}

const uninitialize = () => {
    // Code!
    // Use Animation Frame Id to cancel rendering if needed in background processing!
    if(animationFrameId){
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if(depthTexture){
        depthTexture.destroy();
        depthTexture = null;
    }

    // Cleanup Resources
    if(context){
        context.unconfigure();
        context = null;
    }

    if(texture_teapot_color) {
        texture_teapot_color.destroy();
        texture_teapot_color = null;
    }

    if(texture_teapot_depth) {
        texture_teapot_depth.destroy();
        texture_teapot_depth = null;
    }

    if(texture_marble) {
        texture_marble.destroy();
        texture_marble = null;
    }


    // Cleanup Device
    if(device){
       device = null;
        queue = null;
        perspectiveProjectionMatrix = null;
        perspectiveProjectionMatrix_fbo = null;
        depthTexture = null;

        // Teapot related resources
        texture_marble = null;
        sampler_marble = null;
        sampler_teapot = null;
        renderPipeline_teapot = null;
        buffer_uniform_teapot = null;
        bindingGroup_uniform_teapot = null;
        bindingGroup_marble_texture_sampler_teapot = null;
        buffer_teapot_position = null;
        buffer_teapot_normal = null;
        buffer_teapot_texcoord = null;
        buffer_teapot_element = null;

        // Cube related resources
        renderPipeline_cube = null;
        buffer_uniform_cube = null;
        bindingGroup_uniform_cube = null;
        buffer_cube_position = null;
        buffer_cube_normal = null;
        buffer_cube_texcoord = null;

        // cube related
        renderPipeline_cube = null;
        buffer_uniform_cube = null;
        bindingGroup_uniform_cube = null;
        bindingGroup_teapot_texture_sampler_cube = null;
        buffer_cube_position = null;
        buffer_cube_texcoord = null;
    }

    perspectiveProjectionMatrix = null;
    perspectiveProjectionMatrix_fbo = null;

    console.log("WebGPU Resources Uninitialized!");
}

const onKeyDown = (event) => {
    // Code!
    switch(event.key) {

        case "Escape":
            uninitialize();
            window.close(); // this may not work in all browsers
            break;
        
        case "f":
        case "F":
            toggleFullScreen();
            break;

        case "l":
        case "L":
            bLighting = !bLighting;
            break;

        case "t":
        case "T":
            bTexture = !bTexture;
            break;

        case "a":
        case "A":
            bAnimation = !bAnimation;
            break;

        default:
            break;
    }
}

const onMouseClick = (event) => {
    // Code!
}

const degToRad = (angleInDegrees) => {
    return (angleInDegrees * Math.PI / 180.0);
}