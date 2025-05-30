import os
import gdown

def download_missing_models():
    # Create necessary directories
    os.makedirs('sentence_transformer_model', exist_ok=True)
    
    # Model file URLs
    model_urls = {
        'transformer_en_te.pth': 'https://drive.google.com/uc?id=1_2zAm5AL554diNS_7dvI50DRvZbnUGdE',
        'sentence_transformer_model/model.safetensors': 'https://drive.google.com/uc?id=1wzhamHQkgoau2jZgoEchE4UzgOVurlBO'
    }
    
    for file_path, url in model_urls.items():
        if not os.path.exists(file_path):
            print(f"Downloading {file_path}...")
            try:
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                gdown.download(url, file_path, quiet=False)
                print(f"Successfully downloaded {file_path}")
            except Exception as e:
                print(f"Error downloading {file_path}: {str(e)}")
                raise
        else:
            print(f"{file_path} already exists!")

if __name__ == "__main__":
    download_missing_models() 