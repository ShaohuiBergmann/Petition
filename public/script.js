const canvas = document.getElementById("signature-pad");
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}
window.onresize = resizeCanvas;
resizeCanvas();
const signaturePad = new SignaturePad(canvas, {
    backgroundColor: "rgb(250,250,250)",
});

document.getElementById("clear").addEventListener("click", function () {
    signaturePad.clear();
});
document.addEventListener("mouseup", () => {
    console.log(signaturePad.toDataURL());
    let dataURL = signaturePad.toDataURL();
    console.log("dataurl", dataURL);
    document.getElementById("sign").value = dataURL;
});
