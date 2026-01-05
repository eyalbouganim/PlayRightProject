import tensorflow as tf
import numpy as np

def class_weighted_loss(y_true, y_pred):
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
    weight_vector = y_true * 9.0 + 1.0 
    weighted_bce = weight_vector * bce
    return tf.reduce_mean(weighted_bce)

print("Loading model...")
# Pass the custom object when loading
model = tf.keras.models.load_model(
    "polyphonic_model.keras", 
    custom_objects={'class_weighted_loss': class_weighted_loss}
)

# 2. Create FAKE input (Random static noise, Max volume)
# Shape: (1, 100 time_steps, 88 features)
fake_input = np.random.rand(1, 100, 88).astype(np.float32)

# 3. Predict
print("Running diagnostic...")
preds = model.predict(fake_input)

# 4. Analyze
max_val = np.max(preds)
avg_val = np.mean(preds)

print(f"\n--- DIAGNOSTIC RESULTS ---")
print(f"Max Confidence: {max_val:.5f} (Should be close to 1.0)")
print(f"Avg Confidence: {avg_val:.5f}")

if max_val < 0.05:
    print("❌ STATUS: COMATOSE")
    print("The model output is effectively zero for everything.")
    print("Reason: It likely suffered from 'Vanishing Gradients' or trained on empty data.")
elif max_val < 0.5:
    print("⚠️ STATUS: WEAK")
    print("The model is responding, but very unsure of itself.")
else:
    print("✅ STATUS: ALIVE")
    print("The model is reacting strongly. The issue is likely your audio preprocessing.")