from django.shortcuts import render

# Create your views here.
import json
import time
import threading
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import render
from google.cloud import vision
from google.oauth2 import service_account

# Thread-safe shared state
# Using a lock ensures validate_note and event_stream
# can't read/write at the same time causing data corruption
_lock = threading.Lock()
_latest = {
    'verdict': None,
    'labels': [],
    'timestamp': None
}


def get_latest():
    """Returns a safe copy of the latest result."""
    with _lock:
        return dict(_latest)


def set_latest(verdict, labels):
    """Updates the shared state with a new verdict and timestamp."""
    with _lock:
        _latest['verdict'] = verdict
        _latest['labels'] = labels
        _latest['timestamp'] = time.time()


def event_stream():
    """
    Generator function that yields Server-Sent Events to the browser.
    Runs in a continuous loop, checking for new verdicts every 0.5 seconds.
    Only sends an event when the timestamp changes.
    """
    last_sent = None
    while True:
        current = get_latest()
        current_ts = current.get('timestamp')
        if current_ts != last_sent:
            last_sent = current_ts
            data = json.dumps(current)
            yield f'data: {data}\n\n'
        time.sleep(0.5)


def live_verdict(request):
    """
    SSE endpoint — holds an open HTTP connection to the browser
    and streams verdict updates as they arrive from the ESP32.
    """
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    # Prevent caching and ensure data flows through immediately
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@csrf_exempt
def validate_note(request):
    """
    Receives a JPEG image POSTed by the ESP32 over WiFi.
    Sends the image to Google Cloud Vision API for label detection.
    Returns a JSON verdict of 'accept' or 'reject' based on the labels.
    Also updates shared state so the SSE stream picks it up.
    """
    if request.method == 'POST' and request.FILES.get('image'):
        image_file = request.FILES['image'].read()

        # Load Google credentials from service account JSON
        credentials = service_account.Credentials.from_service_account_file(
            r'C:\Users\Richa\OneDrive\Documents\vscode-projects\banknote_validator\bank-validator-195284c439a9.json'
        )

        # Send image to Google Vision for label detection
        client = vision.ImageAnnotatorClient(credentials=credentials)
        image = vision.Image(content=image_file)
        response = client.label_detection(image=image)

        # Extract label descriptions and convert to lowercase
        labels = [label.description.lower() for label in response.label_annotations]
        

        # If any label matches a keyword, accept the note
        accept_keywords = ['banknote', 'money', 'currency', 'cash', 'pound', 'dollar', 'paper currency']
        verdict = 'accept' if any(k in labels for k in accept_keywords) else 'reject'

        # Update shared state for SSE stream
        set_latest(verdict, labels)

        return JsonResponse({'verdict': verdict, 'labels': labels})

    return JsonResponse({'error': 'No image received'}, status=400)


def latest_verdict(request):
    """
    Simple JSON endpoint that returns the most recent verdict.
    Used as a fallback if SSE isn't supported by the browser.
    """
    return JsonResponse(get_latest())


def index(request):
    """
    Serves the main frontend HTML page.
    """
    return render(request, 'index.html')