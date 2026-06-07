from django.shortcuts import render

# Create your views here.
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from google.cloud import vision
from google.oauth2 import service_account

# Store the latest verdict in memory
latest_result = {
    'verdict': None,
    'labels': []
}

@csrf_exempt
def validate_note(request):
    if request.method == 'POST' and request.FILES.get('image'):
        image_file = request.FILES['image'].read()

        credentials = service_account.Credentials.from_service_account_file(
            r'bank-validator-195284c439a9.json'
        )
        client = vision.ImageAnnotatorClient(credentials=credentials)
        image = vision.Image(content=image_file)
        response = client.label_detection(image=image)

        labels = [label.description.lower() for label in response.label_annotations]
        print(f"Labels returned: {labels}")

        accept_keywords = ['banknote', 'money', 'currency', 'cash', 'pound', 'dollar', 'paper currency']
        verdict = 'accept' if any(k in labels for k in accept_keywords) else 'reject'

        # Store for frontend to pick up
        latest_result['verdict'] = verdict
        latest_result['labels'] = labels

        return JsonResponse({'verdict': verdict, 'labels': labels})

    return JsonResponse({'error': 'No image received'}, status=400)


def latest_verdict(request):
    return JsonResponse(latest_result)


def index(request):
    return render(request, 'index.html')