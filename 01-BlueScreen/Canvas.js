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

    // Set Clear Color
    clearColor = {r: 0.0, g: 0.0, b: 1.0, a: 1.0};
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
    
    // Create Render Pass Encoder from Command Encoder
    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    if(!renderPassEncoder){
        console.log("Failed to get Render Pass Encoder!");
        throw Error("Failed to get Render Pass Encoder!");
    }

    // End Render Pass
    renderPassEncoder.end();

    // Finish Command Encoder and submit Command Buffer to Queue for execution
    queue.submit([commandEncoder.finish()]);

    // Animation Loop
    animationFrameId = requestAnimationFrame(display);
}

const update = () =>{
    // Code!
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
    }

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