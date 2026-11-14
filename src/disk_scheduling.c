
#include <stdio.h>
#include <stdlib.h>

#define MAX_REQUESTS 1000

/*
    Algorithm IDs:
    0 = FCFS
    1 = SSTF
    2 = SCAN
    3 = C-SCAN
    4 = LOOK
    5 = C-LOOK

    direction:
     1 = toward higher cylinders
    -1 = toward lower cylinders

    path[] stores positions for animation.
    service[] stores request service order.

    Returns:
    Total head movement on success.
    -1 on invalid input.
*/

// Add a cylinder to the movement path.
// Avoid duplicate consecutive positions.
static void addPath(int path[], int *pathLen, int cylinder)
{
    if (*pathLen == 0 || path[*pathLen - 1] != cylinder)
    {
        path[(*pathLen)++] = cylinder;
    }
}

// Add a serviced request.
static void addService(int service[], int *serviceLen, int cylinder)
{
    service[(*serviceLen)++] = cylinder;
}

// Sort requests in ascending order.
static void sortRequests(int arr[], int n)
{
    for (int i = 1; i < n; i++)
    {
        int key = arr[i];
        int j = i - 1;

        while (j >= 0 && arr[j] > key)
        {
            arr[j + 1] = arr[j];
            j--;
        }

        arr[j + 1] = key;
    }
}

// Calculate movement from the completed path.
static int calculateMovement(int path[], int pathLen)
{
    int total = 0;

    for (int i = 1; i < pathLen; i++)
    {
        int difference = path[i] - path[i - 1];

        if (difference < 0)
            difference = -difference;

        total += difference;
    }

    return total;
}

// Main disk scheduling engine.
int runDiskScheduling(
    int algorithm,
    int requests[],
    int n,
    int head,
    int diskMin,
    int diskMax,
    int direction,
    int path[],
    int *pathLen,
    int service[],
    int *serviceLen)
{
    // Validate input.
    if (n < 0 || n > MAX_REQUESTS)
        return -1;

    if (diskMin >= diskMax)
        return -1;

    if (head < diskMin || head > diskMax)
        return -1;

    if (direction != 1 && direction != -1)
        return -1;

    if (algorithm < 0 || algorithm > 5)
        return -1;

    for (int i = 0; i < n; i++)
    {
        if (requests[i] < diskMin ||
            requests[i] > diskMax)
        {
            return -1;
        }
    }

    *pathLen = 0;
    *serviceLen = 0;

    // Start at the initial head position.
    addPath(path, pathLen, head);

    if (n == 0)
        return 0;

    // Copy and sort requests.
    int sorted[MAX_REQUESTS];

    for (int i = 0; i < n; i++)
        sorted[i] = requests[i];

    sortRequests(sorted, n);

    // ------------------------------------------------
    // FCFS: First Come First Serve
    // ------------------------------------------------
    if (algorithm == 0)
    {
        for (int i = 0; i < n; i++)
        {
            addPath(path, pathLen, requests[i]);

            addService(
                service,
                serviceLen,
                requests[i]
            );
        }
    }

    // ------------------------------------------------
    // SSTF: Shortest Seek Time First
    // ------------------------------------------------
    else if (algorithm == 1)
    {
        int visited[MAX_REQUESTS] = {0};
        int current = head;

        for (int count = 0; count < n; count++)
        {
            int best = -1;
            int minDistance = 2147483647;

            for (int i = 0; i < n; i++)
            {
                if (visited[i])
                    continue;

                int distance = requests[i] - current;

                if (distance < 0)
                    distance = -distance;

                // Ties are resolved by input order.
                if (distance < minDistance)
                {
                    minDistance = distance;
                    best = i;
                }
            }

            if (best == -1)
                break;

            visited[best] = 1;

            current = requests[best];

            addPath(path, pathLen, current);

            addService(
                service,
                serviceLen,
                current
            );
        }
    }

    // ------------------------------------------------
    // SCAN: Elevator Algorithm
    // ------------------------------------------------
    else if (algorithm == 2)
    {
        if (direction == 1)
        {
            // Service requests toward higher cylinders.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] >= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Reach the physical disk boundary.
            addPath(path, pathLen, diskMax);

            // Reverse direction.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] < head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
        else
        {
            // Service requests toward lower cylinders.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] <= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Reach the physical disk boundary.
            addPath(path, pathLen, diskMin);

            // Reverse direction.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] > head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
    }

    // ------------------------------------------------
    // C-SCAN: Circular SCAN
    // ------------------------------------------------
    else if (algorithm == 3)
    {
        if (direction == 1)
        {
            // Move toward the maximum cylinder.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] >= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            addPath(path, pathLen, diskMax);

            // Circular jump to the beginning.
            addPath(path, pathLen, diskMin);

            // Continue in the same direction.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] < head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
        else
        {
            // Move toward the minimum cylinder.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] <= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            addPath(path, pathLen, diskMin);

            // Circular jump to the end.
            addPath(path, pathLen, diskMax);

            // Continue in the same direction.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] > head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
    }

    // ------------------------------------------------
    // LOOK: SCAN without reaching physical boundaries
    // ------------------------------------------------
    else if (algorithm == 4)
    {
        if (direction == 1)
        {
            // Higher requests first.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] >= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Reverse at the last request.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] < head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
        else
        {
            // Lower requests first.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] <= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Reverse at the last request.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] > head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
    }

    // ------------------------------------------------
    // C-LOOK: Circular LOOK
    // ------------------------------------------------
    else if (algorithm == 5)
    {
        if (direction == 1)
        {
            // Service higher requests in ascending order.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] >= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Wrap to the lowest remaining request.
            for (int i = 0; i < n; i++)
            {
                if (sorted[i] < head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
        else
        {
            // Service lower requests in descending order.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] <= head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }

            // Wrap to the highest remaining request.
            for (int i = n - 1; i >= 0; i--)
            {
                if (sorted[i] > head)
                {
                    addPath(path, pathLen, sorted[i]);

                    addService(
                        service,
                        serviceLen,
                        sorted[i]
                    );
                }
            }
        }
    }

    return calculateMovement(path, *pathLen);
}

#ifndef __EMSCRIPTEN__

// Native C test program.
// This main() is excluded when compiling for WebAssembly.

int main(void)
{
    int requests[] = {
        98, 183, 37, 122,
        14, 124, 65, 67
    };

    int n = sizeof(requests) / sizeof(requests[0]);

    int head = 53;
    int diskMin = 0;
    int diskMax = 199;
    int direction = 1;

    int path[MAX_REQUESTS + 4];
    int service[MAX_REQUESTS + 4];

    int pathLen = 0;
    int serviceLen = 0;

    for (int algorithm = 0; algorithm < 6; algorithm++)
    {
        int total = runDiskScheduling(
            algorithm,
            requests,
            n,
            head,
            diskMin,
            diskMax,
            direction,
            path,
            &pathLen,
            service,
            &serviceLen
        );

        printf("\nAlgorithm: %d\n", algorithm);

        printf("Movement Path: ");

        for (int i = 0; i < pathLen; i++)
            printf("%d ", path[i]);

        printf("\nService Order: ");

        for (int i = 0; i < serviceLen; i++)
            printf("%d ", service[i]);

        printf("\nTotal Head Movement: %d\n", total);
    }

    return 0;
}

#endif
