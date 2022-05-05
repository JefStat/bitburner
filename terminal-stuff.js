let doc=globalThis["document"];
let termPrompt=promptText=>{
    let termInput = doc.querySelector("div[spellcheck]");
    if (!termInput) throw new Error("Tried to call for terminal prompt but terminal is not visible");
    let customPrompt=termInput.insertAdjacentElement("beforeBegin",termInput.cloneNode(true));
    termInput.style.display="none";
    customPrompt.querySelector("p").innerText=promptText+" ";
    customPrompt.querySelector("p").style.whiteSpace="pre";
    let customInput = customPrompt.querySelector("input");
    customInput.focus();
    return new Promise(r=>customInput.addEventListener("keydown",e=>{
        e.stopPropagation();
        if (e.key === "Enter"){
            customPrompt.remove();
            termInput.style.display="";
            r(customInput.value);
        }
    }));
}

//Can be easily moved to a separate file.

export async function main(ns) {
    ns.tprint(`You said that ${await termPrompt("What is your age?")} was your age.`)
    ns.tprint(`You said that ${await termPrompt("What is your favorite color?")} was your favorite color.`)
}