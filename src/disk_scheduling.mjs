const MAX_REQUESTS = 1000;
const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

function addPath(path, cylinder) {
    if (path.length === 0 || path[path.length - 1] !== cylinder) {
        path.push(cylinder);
    }
}

function addService(service, cylinder) {
    service.push(cylinder);
}

function calculateMovement(path) {
    let total = 0;

    for (let index = 1; index < path.length; index += 1) {
        total += Math.abs(path[index] - path[index - 1]);

        if (total > INT_MAX) {
            throw new RangeError("Total head movement exceeds the supported range.");
        }
    }

    return total;
}

export function runDiskScheduling(
    algorithm,
    requests,
    head,
    diskMin,
    diskMax,
    direction
) {
    if (!Array.isArray(requests) || requests.length > MAX_REQUESTS) {
        throw new RangeError("Maximum 1000 requests are supported.");
    }

    if (!Number.isInteger(algorithm) || algorithm < 0 || algorithm > 5) {
        throw new RangeError("Invalid scheduling algorithm.");
    }

    if (
        !Number.isInteger(diskMin) ||
        !Number.isInteger(diskMax) ||
        diskMin < INT_MIN ||
        diskMax > INT_MAX ||
        diskMin >= diskMax
    ) {
        throw new RangeError("Invalid disk cylinder range.");
    }

    if (
        !Number.isInteger(head) ||
        head < diskMin ||
        head > diskMax
    ) {
        throw new RangeError("Head position is outside the disk range.");
    }

    if (direction !== 1 && direction !== -1) {
        throw new RangeError("Invalid initial direction.");
    }

    if (requests.some(request =>
        !Number.isInteger(request) ||
        request < diskMin ||
        request > diskMax
    )) {
        throw new RangeError("Requests must be valid disk cylinders.");
    }

    const path = [head];
    const service = [];

    if (requests.length === 0) {
        return { total: 0, path, service };
    }

    const sorted = [...requests].sort((a, b) => a - b);

    if (algorithm === 0) {
        requests.forEach(request => {
            addPath(path, request);
            addService(service, request);
        });
    } else if (algorithm === 1) {
        const visited = new Array(requests.length).fill(false);
        let current = head;

        for (let count = 0; count < requests.length; count += 1) {
            let best = -1;
            let minDistance = Infinity;

            for (let index = 0; index < requests.length; index += 1) {
                if (visited[index]) continue;

                const distance = Math.abs(requests[index] - current);

                if (distance < minDistance) {
                    minDistance = distance;
                    best = index;
                }
            }

            if (best === -1) break;

            visited[best] = true;
            current = requests[best];
            addPath(path, current);
            addService(service, current);
        }
    } else if (algorithm === 2 || algorithm === 3) {
        if (direction === 1) {
            sorted.filter(request => request >= head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });

            addPath(path, diskMax);

            if (algorithm === 3) addPath(path, diskMin);

            const lowerRequests = algorithm === 2
                ? sorted.slice().reverse().filter(request => request < head)
                : sorted.filter(request => request < head);

            lowerRequests.forEach(request => {
                addPath(path, request);
                addService(service, request);
            });
        } else {
            sorted.slice().reverse().filter(request => request <= head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });

            addPath(path, diskMin);

            if (algorithm === 3) addPath(path, diskMax);

            const higherRequests = algorithm === 2
                ? sorted.filter(request => request > head)
                : sorted.slice().reverse().filter(request => request > head);

            higherRequests.forEach(request => {
                addPath(path, request);
                addService(service, request);
            });
        }
    } else if (algorithm === 4) {
        if (direction === 1) {
            sorted.filter(request => request >= head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });

            sorted.slice().reverse().filter(request => request < head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });
        } else {
            sorted.slice().reverse().filter(request => request <= head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });

            sorted.filter(request => request > head).forEach(request => {
                addPath(path, request);
                addService(service, request);
            });
        }
    } else if (algorithm === 5) {
        if (direction === 1) {
            [...sorted.filter(request => request >= head), ...sorted.filter(request => request < head)]
                .forEach(request => {
                    addPath(path, request);
                    addService(service, request);
                });
        } else {
            [
                ...sorted.slice().reverse().filter(request => request <= head),
                ...sorted.slice().reverse().filter(request => request > head)
            ].forEach(request => {
                addPath(path, request);
                addService(service, request);
            });
        }
    }

    return {
        total: calculateMovement(path),
        path,
        service
    };
}
