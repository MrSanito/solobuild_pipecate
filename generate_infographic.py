import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node.js Architecture Internals</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #0b0f19;
            color: #a0aec0;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .highlight-text { color: #5eead4; }
        .box-app { border-color: #f6e05e; }
        .box-v8 { border-color: #f6e05e; }
        .box-api { border-color: #68d391; }
        .box-bindings { border-color: #b794f4; }
        .box-libuv { border-color: #4fd1c5; }
        .box-workers { border-color: #f687b3; }
        .box-os { border-color: #63b3ed; }
        
        .box {
            border-width: 1px;
            border-style: solid;
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
        }
    </style>
</head>
<body class="p-8">

<div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <div>
        <p class="text-teal-400 font-mono text-sm mb-2">// HOW NODE.JS ACTUALLY RUNS YOUR CODE</p>
        <h1 class="text-white text-3xl font-bold mb-4">Application → V8 → Bindings → <span class="text-teal-400">libuv</span> owns the Event Loop</h1>
        <p class="text-sm max-w-4xl">Ek hi flow, left se right — Application aur V8 se shuru hoke, Node.js Bindings ke through, libuv tak (jo Event Queue + Event Loop + Thread Pool + OS Async I/O sab andar rakhta hai), aur alag se Worker Threads, jo apna khud ka V8 + libuv instance spawn karte hain.</p>
    </div>

    <!-- Architecture Diagram Section -->
    <div class="flex flex-col lg:flex-row gap-6">
        
        <!-- Left Column: App & V8 -->
        <div class="flex flex-col gap-6 w-full lg:w-1/4">
            <div class="box box-app flex flex-col items-center justify-center h-24">
                <h2 class="text-yellow-400 font-bold tracking-wider text-sm">APPLICATION</h2>
                <p class="text-xs">your JavaScript code</p>
            </div>
            
            <div class="text-center text-xs font-mono text-yellow-500">JAVASCRIPT &darr;</div>

            <div class="box box-v8 flex flex-col gap-4">
                <h2 class="text-yellow-400 font-bold tracking-wider text-sm">V8 ENGINE</h2>
                <div class="border border-yellow-700/50 p-2 text-center rounded bg-gray-800/30">
                    <p class="text-white font-semibold text-sm">Call Stack</p>
                    <p class="text-xs">sync execution</p>
                </div>
                <div class="border border-yellow-700/50 p-2 text-center rounded bg-gray-800/30">
                    <p class="text-white font-semibold text-sm">Heap</p>
                    <p class="text-xs">object memory</p>
                </div>
                <div class="border border-yellow-700/50 p-2 text-center rounded bg-gray-800/30">
                    <p class="text-white font-semibold text-sm">Microtask Queue</p>
                    <p class="text-xs">Promises, queueMicrotask</p>
                </div>
            </div>
        </div>

        <!-- Middle Column: APIs & Bindings -->
        <div class="flex flex-col gap-6 w-full lg:w-1/4 pt-8">
            <div class="box box-api flex flex-col items-center justify-center h-24 text-center">
                <h2 class="text-green-400 font-bold tracking-wider text-sm">NODE.JS APIs</h2>
                <p class="text-xs">fs · http · timers · crypto</p>
                <p class="text-xs text-gray-500">(Node API — JS land)</p>
            </div>
            <div class="box box-bindings flex flex-col items-center justify-center h-24 text-center">
                <h2 class="text-purple-400 font-bold tracking-wider text-sm">NODE.JS BINDINGS</h2>
                <p class="text-xs">C++ glue &rarr; libuv C API</p>
                <p class="text-xs text-gray-500">this is where async is decided</p>
            </div>
            <div class="box border-gray-600 flex flex-col items-center justify-center h-24 text-center">
                <h2 class="text-gray-300 font-bold tracking-wider text-sm">SYNC LIBUV CALL</h2>
                <p class="text-xs">same fn, no callback &mdash; runs inline</p>
                <p class="text-xs text-red-400 font-semibold">&mdash; BLOCKS the calling thread</p>
            </div>
        </div>

        <!-- Right Column: LIBUV -->
        <div class="box box-libuv w-full lg:w-2/4 relative">
            <h2 class="text-teal-400 font-bold tracking-wider text-sm">LIBUV</h2>
            <p class="text-xs mb-6">owns the event loop — async I/O engine</p>
            
            <div class="flex flex-row gap-4 h-full">
                <!-- Event Queue -->
                <div class="w-1/3 flex flex-col gap-2">
                    <h3 class="text-teal-300 text-xs font-semibold mb-2">EVENT QUEUE</h3>
                    <div class="border border-teal-800 border-dashed h-8 rounded"></div>
                    <div class="border border-teal-800 border-dashed h-8 rounded flex items-center justify-center text-xs text-yellow-600">BLOCKING OPERATION &rarr;</div>
                    <div class="border border-teal-800 border-dashed h-8 rounded"></div>
                    <div class="border border-teal-800 border-dashed h-8 rounded"></div>
                    <div class="mt-auto text-xs text-yellow-600 font-mono text-center">&larr; EXECUTE CALLBACK</div>
                </div>

                <!-- Event Loop -->
                <div class="w-1/3 relative border-r border-teal-900/50 pr-4">
                    <h3 class="text-teal-300 text-xs font-semibold mb-2 text-center">EVENT LOOP</h3>
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-700 border-dashed w-32 h-32 flex items-center justify-center">
                        <div class="grid grid-cols-2 gap-4 w-full h-full p-2 relative">
                            <!-- Loop phases placeholders -->
                        </div>
                    </div>
                </div>

                <!-- Thread Pool & OS Async -->
                <div class="w-1/3 flex flex-col gap-4">
                    <div class="box border-orange-400 p-2">
                        <h3 class="text-orange-400 font-bold text-xs mb-1">Thread Pool</h3>
                        <p class="text-[10px] mb-2">default 4 threads</p>
                        <div class="grid grid-cols-2 gap-1 mb-2">
                            <div class="border border-orange-800 h-6"></div><div class="border border-orange-800 h-6"></div>
                            <div class="border border-orange-800 h-6"></div><div class="border border-orange-800 h-6"></div>
                        </div>
                        <p class="text-[10px] text-center text-orange-200">File System<br>DNS &middot; Crypto<br>Zlib</p>
                        <p class="text-[9px] text-center text-orange-400 mt-1">blocking C calls</p>
                    </div>

                    <div class="box box-os p-2 text-center">
                        <h3 class="text-blue-400 font-bold text-xs mb-1">OS Async I/O</h3>
                        <p class="text-[10px] mb-4">epoll &middot; kqueue &middot; IOCP</p>
                        <p class="text-[10px] text-blue-200">Network sockets</p>
                        <p class="text-[9px] text-blue-400 mt-2">no thread used &mdash;<br>OS notifies directly</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Far Right Column: Workers -->
        <div class="box box-workers border-dashed w-full lg:w-1/4">
            <h2 class="text-pink-400 font-bold tracking-wider text-sm mb-1">WORKER THREADS</h2>
            <p class="text-xs mb-6">worker_threads module &mdash; separate OS thread</p>
            
            <div class="flex flex-col gap-4">
                <div class="border border-pink-700/50 rounded p-3 text-center bg-pink-900/10">
                    <p class="text-white text-sm font-semibold">new Worker(file)</p>
                    <p class="text-[10px]">spawns a real OS thread</p>
                </div>
                <div class="border border-pink-700/50 rounded p-3 text-center bg-pink-900/10">
                    <p class="text-white text-sm font-semibold">V8 Isolate #2</p>
                    <p class="text-[10px]">own memory, own heap</p>
                </div>
                <div class="border border-pink-700/50 rounded p-3 text-center bg-pink-900/10">
                    <p class="text-white text-sm font-semibold">Own libuv Event Loop</p>
                    <p class="text-[10px]">a full mini Node runtime</p>
                </div>
                <div class="border border-pink-700/50 rounded p-3 text-center bg-pink-900/10">
                    <p class="text-white text-sm font-semibold">Heavy JS Computation</p>
                    <p class="text-[10px]">runs truly in parallel &mdash;<br>main event loop never blocks</p>
                </div>
                <p class="text-xs text-center text-pink-400 mt-2 font-mono">postMessage &rlarr; MessageChannel</p>
            </div>
        </div>

    </div>
    
    <!-- Legend Section -->
    <div class="flex flex-wrap gap-2 mt-8">
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-yellow-400"><strong class="text-white">V8 Engine</strong> &mdash; call stack, heap, microtasks</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-green-400"><strong class="text-white">Node.js APIs</strong> &mdash; fs, http, timers, crypto</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-purple-400"><strong class="text-white">Bindings</strong> &mdash; decides sync vs async</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-gray-400"><strong class="text-white">Sync libuv Call</strong> &mdash; runs inline, blocks</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-teal-600"><strong class="text-white">Event Queue</strong> &mdash; callbacks waiting their turn</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-teal-400"><strong class="text-white">Event Loop</strong> &mdash; 6 phases, cycles forever</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-orange-400"><strong class="text-white">Thread Pool</strong> &mdash; 4 threads, blocking C calls</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-blue-400"><strong class="text-white">OS Async I/O</strong> &mdash; sockets, zero extra threads</span>
        <span class="bg-gray-800 text-xs px-2 py-1 rounded border-l-4 border-pink-400"><strong class="text-white">Worker Threads</strong> &mdash; own isolate, own event loop</span>
    </div>

</div>

</body>
</html>
"""

def generate():
    output_path = os.path.join(os.getcwd(), 'node_architecture.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Generated HTML infographic at {output_path}")

if __name__ == "__main__":
    generate()
