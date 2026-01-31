##
## REFERENCE SCRIPT FROM GOOGLE GEMINI FOR API USAGE
##

#!/usr/bin/env python3

import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# 1. Setup the Client for Vertex AI
# Ensure you have 'GOOGLE_CLOUD_PROJECT' set in your environment
client = genai.Client(
    vertexai=True, 
    project="your-project-id", 
    location="us-central1"
)

def generate_multimodal_content():
    # --- TASK 1: Language Generation (Gemini 3) ---
    print("Generating text...")
    text_response = client.models.generate_content(
        model="gemini-3-flash",
        contents="Write a short, 2-sentence marketing slogan for a futuristic coffee shop on Mars."
    )
    slogan = text_response.text
    print(f"Slogan: {slogan}\n")

    # --- TASK 2: Image Generation (Imagen 3) ---
    print("Generating image...")
    image_response = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=f"A high-quality photo of a {slogan}. Neon lights, cinematic lighting, red martian dust visible through windows.",
        config=types.GenerateImagesConfig(number_of_images=1)
    )
    
    # Save the generated image
    for i, generated_image in enumerate(image_response.generated_images):
        img = Image.open(BytesIO(generated_image.image.image_bytes))
        img.save(f"mars_coffee_{i}.png")
        print(f"Image saved as mars_coffee_{i}.png")

    # --- TASK 3: Text-to-Speech (Gemini TTS) ---
    print("\nGenerating speech...")
    # Using the dedicated TTS-optimized Gemini model
    tts_response = client.models.generate_content(
        model="gemini-2.5-flash-tts",
        contents=f"Say enthusiastically: {slogan}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                )
            )
        )
    )

    # Save the audio bytes to a file
    with open("slogan_speech.wav", "wb") as f:
        # Note: In 2026, the SDK provides the audio data directly in the parts
        audio_part = tts_response.candidates[0].content.parts[0]
        f.write(audio_part.inline_data.data)
    print("Audio saved as slogan_speech.wav")

if __name__ == "__main__":
    generate_multimodal_content()
