// Global Vartiables
var canvas = null;
var bFullScreen = false;
var canvasOriginalWidth;
var canvasOriginalHeight;

//WebGPU related
var clearColor;
let device = null;
let context = null;
let queue = null;
let canvasFormat = null;
let animationFrameId = null;
let buffer_position_triangle = null;
let buffer_position_square = null;
let buffer_color_triangle = null;
let buffer_color_square = null;
let renderPipeline = null;
let buffer_mvpUniform_triangle = null;
let buffer_mvpUniform_square = null;
let bindingGroup_mvpUniform_triangle = null;
let bindingGroup_mvpUniform_square = null;
let perspectiveProjectionMatrix = null;
let angleTriangle = 0.0;
let angleSquare = 0.0;

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
    initialize();

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
    buffer_position_triangle = null;
    buffer_position_square = null;
    renderPipeline = null;
    buffer_mvpUniform_triangle = null;
    buffer_mvpUniform_square = null;
    buffer_color_triangle = null;
    buffer_color_square = null;
    bindingGroup_mvpUniform_triangle = null;
    bindingGroup_mvpUniform_square = null;
    perspectiveProjectionMatrix = null;
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
const initialize = () => {
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

    // Write vertex shader code in WGSL
    const vertexShaderSourceCode = `
        struct MVPUniform {
            mvpMatrix: mat4x4<f32>
        };

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) color: vec4<f32>,
        };

        @group(0) @binding(0) var<uniform> mvpUniform: MVPUniform;

        @vertex fn main(@location(0) pos: vec4<f32>, @location(1) col: vec4<f32>) -> VertexOutput {
            var output: VertexOutput;
            output.position = mvpUniform.mvpMatrix * pos;
            output.color = col;
            return output;
        }
    `;

    // Create Vertex shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_vertex = {
        code: vertexShaderSourceCode,
    };

    // Create Vertex Shader Module from Descriptor //! GPUShaderModule
    const vertexShaderModule = device.createShaderModule(shaderModuleDescriptor_vertex);
    if(!vertexShaderModule){
        console.log("Failed to create Vertex Shader Module!");
        throw Error("Failed to create Vertex Shader Module!");
    }
    else {
        console.log("Vertex Shader Module Created Successfully!!..");
    }

    // Write fragment shader code in WGSL
    const fragmentShaderSourceCode = `
        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) color: vec4<f32>,
        };

        @fragment fn main(output: VertexOutput) -> @location(0) vec4<f32> {
            return output.color;
        }
    `;

    // Create Fragment shader module from source code //! GPUShaderModuleDescriptor
    const shaderModuleDescriptor_fragment = {
        code: fragmentShaderSourceCode,
    };

    // Create Fragment Shader Module from Descriptor //! GPUShaderModule
    const fragmentShaderModule = device.createShaderModule(shaderModuleDescriptor_fragment);
    if(!fragmentShaderModule){
        console.log("Failed to create Fragment Shader Module!");
        throw Error("Failed to create Fragment Shader Module!");
    }
    else {
        console.log("Fragment Shader Module Created Successfully!!..");
    }

    // Declare Position Array
    const tirangle_vertex_position = new Float32Array([
        0.0, 1.0, 0.0, 1.0, // Apex
        -1.0, -1.0, 0.0, 1.0, // Left Bottom
        1.0, -1.0, 0.0, 1.0 // Right Bottom
    ]);

    const triangle_vertex_color = new Float32Array([
         1.0, 0.0, 0.0, 1.0, // Apex
        0.0, 1.0, 0.0, 1.0, // Left Bottom
        0.0, 0.0, 1.0, 1.0 // Right Bottom
    ]);

    const square_vertex_position = new Float32Array([
        1.0, 1.0, 0.0, 1.0,
        -1.0, 1.0, 0.0, 1.0,
        -1.0, -1.0, 0.0, 1.0,

        -1.0, -1.0, 0.0, 1.0,
        1.0, -1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0
    ]);

    const square_vertex_color = new Float32Array([
        0.0, 0.0, 1.0, 1.0, // Blue
        0.0, 0.0, 1.0, 1.0, // Blue
        0.0, 0.0, 1.0, 1.0, // Blue

        0.0, 0.0, 1.0, 1.0, // Blue
        0.0, 0.0, 1.0, 1.0, // Blue
        0.0, 0.0, 1.0, 1.0, // Blue
    ]);

    // as we have only one uniform buffer, we will create only one bind group layout and bind group for both triangle and square
    const bindGroupLayout_mvpUniform = createBindGroupLayoutUniform(0, GPUShaderStage.VERTEX, "uniform");

    // Triangle Position Buffer, Color Buffer, Bind Group and Pipeline Layout
    // Create Position Buffer Descriptor //! GPUBufferDescriptor
    const bufferDescriptor_position_triangle = {
        size: tirangle_vertex_position.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // Create Position Buffer from Descriptor //! GPUBuffer
    buffer_position_triangle = device.createBuffer(bufferDescriptor_position_triangle);
    if(!buffer_position_triangle){
        console.log("Failed to create Position Buffer for Triangle!");
        throw Error("Failed to create Position Buffer for Triangle!");
    }
    else {
        console.log("Position Buffer Created Successfully for Triangle!!..");
    }

    // Write data to Position Buffer
    queue.writeBuffer(buffer_position_triangle, 0, tirangle_vertex_position, 0, tirangle_vertex_position.length);

    console.log("Position Buffer Data Written Successfully for Triangle!!..");

    // Color Buffer for Triangle
    const bufferDescriptor_color_triangle = {
        size: triangle_vertex_color.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // Create Color Buffer from Descriptor //! GPUBuffer
    buffer_color_triangle = device.createBuffer(bufferDescriptor_color_triangle);
    if(!buffer_color_triangle){
        console.log("Failed to create Color Buffer for Triangle!");
        throw Error("Failed to create Color Buffer for Triangle!");
    }
    else {
        console.log("Color Buffer Created Successfully for Triangle!!..");
    }

    // Write data to Color Buffer
    queue.writeBuffer(buffer_color_triangle, 0, triangle_vertex_color, 0, triangle_vertex_color.length);

    console.log("Color Buffer Data Written Successfully for Triangle!!..");

    // MVP Uniform Buffer for Triangle
    const mvpUniformSize = 16 * 4; // 4x4 matrix of 32-bit floats = 16 * 4 bytes = 64 bytes
    buffer_mvpUniform_triangle = createUniformBuffer(mvpUniformSize, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Create Bind Group for MVP Uniform Buffer for Triangle
    bindingGroup_mvpUniform_triangle = createBindGroupForUniform(buffer_mvpUniform_triangle, 0, mvpUniformSize, 0, bindGroupLayout_mvpUniform);

    // Square Position Buffer, Color Buffer, Bind Group and Pipeline Layout
    // Create Position Buffer Descriptor //! GPUBufferDescriptor
    const bufferDescriptor_position_square = {
        size: square_vertex_position.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // Create Position Buffer from Descriptor //! GPUBuffer
    buffer_position_square = device.createBuffer(bufferDescriptor_position_square);
    if(!buffer_position_square){
        console.log("Failed to create Position Buffer for Square!");
        throw Error("Failed to create Position Buffer for Square!");
    }
    else {
        console.log("Position Buffer Created Successfully for Square!!..");
    }

    // Write data to Position Buffer
    queue.writeBuffer(buffer_position_square, 0, square_vertex_position, 0, square_vertex_position.length);

    console.log("Position Buffer Data Written Successfully for Square!!..");

    // Color Buffer for Square
    const bufferDescriptor_color_square = {
        size: square_vertex_color.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // Create Color Buffer from Descriptor //! GPUBuffer
    buffer_color_square = device.createBuffer(bufferDescriptor_color_square);
    if(!buffer_color_square){
        console.log("Failed to create Color Buffer for Square!");
        throw Error("Failed to create Color Buffer for Square!");
    }
    else {
        console.log("Color Buffer Created Successfully for Square!!..");
    }

    // Write data to Color Buffer
    queue.writeBuffer(buffer_color_square, 0, square_vertex_color, 0, square_vertex_color.length);

    console.log("Color Buffer Data Written Successfully for Square!!..");

    // MVP Uniform Buffer for Square
    buffer_mvpUniform_square = createUniformBuffer(mvpUniformSize, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    // Create Bind Group for MVP Uniform Buffer for Square
    bindingGroup_mvpUniform_square = createBindGroupForUniform(buffer_mvpUniform_square, 0, mvpUniformSize, 0, bindGroupLayout_mvpUniform);

    // create pipeline layout descriptor //! GPUPipelineLayoutDescriptor
    const pipelineLayoutDescriptor = {
        bindGroupLayouts: [bindGroupLayout_mvpUniform],
    };

    // create pipeline layout from descriptor //! GPUPipelineLayout
    const pipelineLayout = device.createPipelineLayout(pipelineLayoutDescriptor);
    if(!pipelineLayout){
        console.log("Failed to create Pipeline Layout!");
        throw Error("Failed to create Pipeline Layout!");
    }
    else {
        console.log("Pipeline Layout Created Successfully!!..");
    }

    // render pipeline
    // create vertex attribute for position //! GPUVertexAttribute
    const positionVertexAttribute = {
        shaderLocation: 0, // this matches the @location(0) in the shader code
        offset: 0,
        format: "float32x4", // this is a vec4<f32>
    };

    // create vertex buffer layout for position //! GPUVertexBufferLayout
    const positionVertexBufferLayout = {
        attributes: [positionVertexAttribute],
        arrayStride: 4 * 4, // 4 floats * 4 bytes = 16 bytes
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    // create vertex attribute for color //! GPUVertexAttribute
    const colorVertexAttribute = {
        shaderLocation: 1, // this matches the @location(1) in the shader code
        offset: 0,
        format: "float32x4", // this is a vec4<f32>
    };

     // create vertex buffer layout for color //! GPUVertexBufferLayout
    const colorVertexBufferLayout = {
        attributes: [colorVertexAttribute],
        arrayStride: 4 * 4, // 4 floats * 4 bytes = 16 bytes
        stepMode: "vertex", // jump vertex by vertex not instance by instance
    };

    // create vertex state //! GPUVertexState
    const vertexShaderState = {
        module: vertexShaderModule,
        entryPoint: "main",
        buffers: [positionVertexBufferLayout, colorVertexBufferLayout],
    };

    // Fragment State
    // color target state //! GPUColorTargetState
    const colorTargetState = {
        format: canvasFormat,
    };

    // create fragment state //! GPUFragmentState
    const fragmentShaderState = {
        module: fragmentShaderModule,
        entryPoint: "main",
        targets: [colorTargetState],
    };

    // create primitive state //! GPUPrimitiveState
    const primitiveState = {
        frontFace: "ccw", // counter-clockwise front face
        cullMode: "none", // no culling
        topology: "triangle-list",
    };

    // create render pipeline descriptor //! GPURenderPipelineDescriptor
    const renderPipelineDescriptor = {
        layout: pipelineLayout,
        vertex: vertexShaderState,
        fragment: fragmentShaderState,
        primitive: primitiveState,
    };

    // create render pipeline from descriptor //! GPURenderPipeline
    renderPipeline = device.createRenderPipeline(renderPipelineDescriptor);
    if(!renderPipeline){
        console.log("Failed to create Render Pipeline!");
        throw Error("Failed to create Render Pipeline!");
    }
    else {
        console.log("Render Pipeline Created Successfully!!..");
    }

    // initialize perspective projection matrix to identity
    perspectiveProjectionMatrix = mat4.create();

    // Set Clear Color
    clearColor = {r: 0.0, g: 0.0, b: 0.0, a: 1.0};
}

// UDF
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

const resize = () => {
    if(bFullScreen === true) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvasOriginalWidth;
        canvas.height = canvasOriginalHeight;
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

    // Create Render Pass Color Attachment
    const renderPassColorAttachment = {
        view: context.getCurrentTexture().createView(),
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store"
    };

    // Create Render Pass Descriptor
    const renderPassDescriptor = {
        colorAttachments: [renderPassColorAttachment]
    };

    // Create Render Pass Encoder from Command Encoder //! GPURenderPassEncoder
    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    if(!renderPassEncoder){
        console.log("Failed to get Render Pass Encoder!");
        throw Error("Failed to get Render Pass Encoder!");
    }

    renderPassEncoder.setPipeline(renderPipeline);
    renderPassEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    renderPassEncoder.setScissorRect(0, 0, canvas.width, canvas.height);

    // Triangle
    var modelViewMatrix = mat4.create();
    var modelViewProjectionMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [-1.5, 0.0, -6.0]);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, degToRad(angleTriangle));
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);

    // Write data to MVP Uniform Buffer
    queue.writeBuffer(buffer_mvpUniform_triangle, 0, modelViewProjectionMatrix, 0, modelViewProjectionMatrix.length);

    renderPassEncoder.setVertexBuffer(0, buffer_position_triangle);
    renderPassEncoder.setVertexBuffer(1, buffer_color_triangle);
    renderPassEncoder.setBindGroup(0, bindingGroup_mvpUniform_triangle);

    renderPassEncoder.draw(3);

    // Square
    modelViewMatrix = mat4.create();
    modelViewProjectionMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [1.5, 0.0, -6.0]);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, degToRad(angleSquare));
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);

    // Write data to MVP Uniform Buffer
    queue.writeBuffer(buffer_mvpUniform_square, 0, modelViewProjectionMatrix, 0, modelViewProjectionMatrix.length);

    renderPassEncoder.setVertexBuffer(0, buffer_position_square);
    renderPassEncoder.setVertexBuffer(1, buffer_color_square);
    renderPassEncoder.setBindGroup(0, bindingGroup_mvpUniform_square);

    renderPassEncoder.draw(6);

    // End Render Pass
    renderPassEncoder.end();

    // Finish Command Encoder and submit Command Buffer to Queue for execution
    queue.submit([commandEncoder.finish()]);

    // Update Animation
    update();

    // Animation Loop
    animationFrameId = requestAnimationFrame(display);
}

const update = () =>{
    // Code!
    angleTriangle += 1.0;
    if(angleTriangle >= 360.0){
        angleTriangle = 0.0;
    }

    angleSquare += 1.0;
    if(angleSquare >= 360.0){
        angleSquare = 0.0;
    }
}

const uninitialize = () => {
    // Code!
    // Use Animation Frame Id to cancel rendering if needed in background processing!
    if(animationFrameId){
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Cleanup Resources
    if(context){
        context.unconfigure();
        context = null;
    }

    // Cleanup Device
    if(device){
        device.destroy();
        device = null;
        queue = null;
        buffer_position_triangle = null;
        buffer_position_square = null;
        renderPipeline = null;
        buffer_mvpUniform_triangle = null;
        buffer_mvpUniform_square = null;
        buffer_color_triangle = null;
        buffer_color_square = null;
        bindingGroup_mvpUniform_triangle = null;
        bindingGroup_mvpUniform_square = null;
        perspectiveProjectionMatrix = null;
    }

    perspectiveProjectionMatrix = null;

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

        default:
            break;
    }
}

const onMouseClick = (event) => {
    // Code!
}

const degToRad = (degrees) => {
    return degrees * Math.PI / 180.0;
}