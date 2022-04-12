// Basic window class that other widgets are built on
export class curse_window {
    constructor (ns, border=false, height=27, width=51) {
        this.ns = ns;

        // Disable log to prevent it from interfering with display
        this.ns.disableLog("ALL");

        // Relationship to other windows
        // isChild = false means this is the object running the display
        this.ischild = false;
        this.childwin = [];

        // Size of the buffer being output to the log
        this.height = height;
        this.width = width;

        // Location coordinates if set as child
        // Relative to parent window
        this.x = 0;
        this.y = 0;

        // TODO: Unused, planned to sort windows by priority
        this.layer = 0;

        // Window can have a border, default false
        this.border = border;
        this.border_top = true;
        this.border_bottom = true;
        this.border_left = true;
        this.border_right = true;

        // Run once to build the buffer
        this.clearBuffer();
    }

    // Convenience handler to attach child window
    addChild(handle, x, y) {
        handle.setPosition(x, y);
        handle.ischild = true;
        handle.parenthandle = this;
        this.childwin.push(handle);
    }

    // Get dimensions of the drawing area
    getSubDimensions () {
        let bordervbuff = 0;
        let borderwbuff = 0;
        if (this.border) {
            if (this.border_top) {
                bordervbuff++
            }
            if (this.border_bottom) {
                bordervbuff++
            }
            if (this.border_left) {
                borderwbuff++
            }
            if (this.border_right) {
                borderwbuff++
            }
        }
        return [this.width - borderwbuff, this.height - bordervbuff];
    }

    // Resize the window
    setDimensions (height, width) {
        this.height = height;
        this.width = width;
        this.clearBuffer();
    }

    // Change position relative to parent window
    setPosition (x, y) {
        this.x = x;
        this.y = y;
    }

    // Internal function used to print over existing text
    substringReplace (index, source, text) {
        let leftString = source.substring(0, index);
        let rightString = source.substring(index + text.length);
        return [leftString, text, rightString].join('');
    }

    // Basic function to arbitrarily place text in buffer
    addText(x, y, text) {

        // Use adjusted coordinates to adjust for border
        let ay = y;
        let ax = x;
        if (this.border) {
            if (this.border_left) {
                ax++;
            }
            if (this.border_bottom) {
                ay++;
            }
        }

        ay = this.height - ay - 1;

        let drawArea = this.getSubDimensions();

        if (y < drawArea[1] && x < drawArea[0]) {

            // If final line is longer than window, truncate it
            if (text.length + ax > this.width) {
                text = text.substring(0, this.width - ax);
            }

            // Use substringReplace to overwrite existing buffer line
            this.buffer[ay] = this.substringReplace(ax, this.buffer[ay], text);
        }
    }

    // Function to create an empty buffer
    // Bulk of work is to create borders
    clearBuffer() {
        if (this.border) {
            this.buffer = [];
            if (this.border_top) {
                let line = '─'.repeat(this.width);
                if (this.border_left) {
                    line = this.substringReplace(0, line, '┌');
                }
                if (this.border_right) {
                    line = this.substringReplace(line.length - 1, line, '┐');
                }
                this.buffer.push(line);
            }
            let line = ' '.repeat(this.width);
            if (this.border_left) {
                line = this.substringReplace(0, line, '│');
            }
            if (this.border_right) {
                line = this.substringReplace(line.length - 1, line, '│');
            }

            while (this.buffer.length < this.height) {
                this.buffer.push(line);
            }

            if (this.border_bottom) {
                this.buffer.pop();
                let line = '─'.repeat(this.width);
                if (this.border_left) {
                    line = this.substringReplace(0, line, '└');
                }
                if (this.border_right) {
                    line = this.substringReplace(line.length - 1, line, '┘');
                }
                this.buffer.push(line);
            }

        } else {
            // Really simple whitespace buffer if there's no borders
            this.buffer = [];
            let line = ' '.repeat(this.width);
            while (this.buffer.length < this.height) {
                this.buffer.push(line);
            }
        }
    }

    // Print in a single action for experiency
    drawToLog () {
        this.ns.print(this.buffer.join('\n'));
    }

    // Function to composite together the output of this window and all it's
    // children.
    refreshBuffer(print=true) {
        // Proactively clear the log if we're about to print
        if (!this.ischild && print) {
            this.ns.clearLog();
        }

        // Go through children
        // TODO: Add layer support
        for (let i = 0; i < this.childwin.length; i++) {
            const child = this.childwin[i];
            child.render(false);
            let cbuffer = this.childwin[i].buffer;

            // Composite the buffers with the existing buffer
            for (let y = 0; y < cbuffer.length; y++) {
                let index = (this.buffer.length - this.childwin[i].y - this.childwin[i].height) + y;
                this.buffer[index] = this.substringReplace(this.childwin[i].x, this.buffer[index], cbuffer[y]);
                if (this.buffer[index].length > this.width) {
                    this.buffer[index] = this.buffer[index].slice(0,this.width);
                }
            }
        }
    }

    renderParent() {
        if (this.ischild) {
            this.parenthandle.renderParent()
        } else {
            this.render()
        }
    }

    // Function for getting the buffer as a string rather than printing
    // Because ns is not used anywhere in this, is good for asynchronous rendering
    async renderToString(clear=false, refresh=true) {
        if (refresh) {
            this.refreshBuffer(false)
        }
        let output = this.buffer.join('\n');
        if (clear) {
            this.clearBuffer();
        }
        return output;
    }

    // Function compiling together multiple operations
    // Will print the buffer, but also supports simple paging to keep underlying
    // content unchanged.
    render (clear=false, refresh=true ) {
        let tempbuffer = []
        if (!clear) {
            tempbuffer = [...this.buffer];
        }

        if (refresh) {
            this.refreshBuffer();
        }

        if (!this.ischild) {
            this.drawToLog();
        }
        if (clear) {
            this.clearBuffer();
        } else {
            this.buffer = tempbuffer
        }
    }

    // Render wrapper with included async, meant to be a drop i replacement
    // for ns.sleeps in code
    async rendersleep(time, clear=false) {
        let sleephandle = this.ns.asleep(time);
        this.render(clear);
        await sleephandle;
    }
}

// Specialty window, provides scrolling text output. Used to replicated existing
// log window.
export class curse_stream extends curse_window {
    constructor (ns, border=false, height=100, width=51) {
        super(ns, border, height, width);
        this.textBuffer = [];
        this.renderOnPrint = false;
    }

    // extend clearbuffer to make sure it has a clean blankline saved
    clearBuffer() {
        super.clearBuffer();

        this.textBuffer = [];

        if (this.buffer.length > 1) {
            this.blankLine = this.buffer[1]
        } else {
            this.blankLine = this.buffer[0]
        }
    }

    // Mostly a drop in replacement for ns.print
    // TODO: Add support for multiple inputs
    print (input) {
        input = String(input)

        let subdim = super.getSubDimensions();

        // Check width and perform wordwrap if input exceeds linewidth
        let inputWrap = [];
        let inputTail = input.slice(subdim[0]-1);

        while (inputTail != "") {
            inputWrap.push(input.slice(0, subdim[0]-1));
            input = inputTail;
            inputTail = input.slice(subdim[0]-1);
        }
        inputWrap.push(input)

        // Add the lines individually so scrolling can be managed smoothly
        while (inputWrap.length > 0) {
            let line = inputWrap.shift();

            // By removing top index all the bufferlines move up by one inherently
            if (this.border && this.border_top && this.buffer.length > 1) {
                this.buffer.splice(1, 1);
            } else {
                this.buffer.splice(0, 1);
            }

            // Insert a new blankline at the bottom to restore buffer size
            if (this.border && this.border_bottom) {
                this.buffer.splice(-1, 0, this.blankLine)
            } else {
                this.buffer.splice(this.buffer.length, 0, this.blankLine)
            }

            // Use addText to write on the new blankline
            this.addText(0,0,line);

            // Keep the textbuffer for later
            this.textBuffer.push(line);

            // Trim the textbuffer if it's too long
            if (this.textBuffer.length > subdim[1]) {
                this.textBuffer.shift();
            }
        }

        // If set to true, visually makes it print immediately, replicating
        // normal print behavior. Resource intensive.
        if (this.renderOnPrint) {
            super.renderParent();
        }
    }
}

// Simple progress bar widget
export class curse_progress extends curse_window {
    constructor (ns, border=false, height=1, width=51) {
        if (border && height == 1) {
            height = 3;
        }
        super(ns, border, height, width);
    }

    // Only needs on function to generate the progress bar
    update (progress) {
        let width = this.getSubDimensions()[0];
        let increment = width / 100;

        progress = progress * 100;

        this.addText(0, 0, '#'.repeat(Math.ceil(increment * progress)).padEnd(width));
    }
}

// Main function provides example code
/** @param {NS} ns **/
export async function main(ns) {
    const win = new curse_stream(ns, true, 20);
    const progwin = new curse_progress(ns, true, 3, 21);
    const bouncetext = new curse_window(ns, false, 1, 4);

    bouncetext.addText(0,0,"BOO!")

    win.addChild(progwin, 5,6)
    win.addChild(bouncetext, 1, 10);

    let y = 10;
    let x = 1;
    let z = 0;
    let zdir = true
    let drawarea = win.getSubDimensions()
    win.clearBuffer();
    while (true) {
        if (y > drawarea[1] - 1) {
            y = 0;
        }
        if (x > drawarea[0] - 2) {
            x = 0;
        }

        bouncetext.setPosition(x, y)

        if (z > 99) {
            zdir = false
        } else if ( z < 1 ) {
            zdir = true
        }

        progwin.update(z / 100)

        win.print("=".repeat(z));
        await win.rendersleep(800);
        x++;
        y++;
        if (zdir) {
            z++;
        } else {
            z--;
        }
    }
}