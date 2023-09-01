package com.openchsclient;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;
import android.util.Log;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.content.pm.Signature;
import android.app.Activity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class TamperCheckModule extends ReactContextBaseJavaModule {
	private ReactContext mReactContext;

	public TamperCheckModule(ReactApplicationContext context) {
		super(context);
		this.mReactContext = context;
	}

	@Override
	public String getName() {
		return "TamperCheckModule";
	}

  @ReactMethod
  public void validateAppSignature()  {
	  try {
			  Log.i("TamperCheckModule", "Validating app signature");
			  String shaAppGoogleSignature = mReactContext.getResources().getString(R.string.sha256_app_google_signature);
			  String shaAppUploadKeySignature = mReactContext.getResources().getString(R.string.sha256_app_upload_key_signature);
			  PackageInfo packageInfo = mReactContext.getPackageManager().getPackageInfo(
					  mReactContext.getPackageName(), PackageManager.GET_SIGNATURES);

			  Signature[] signatures = packageInfo.signatures;
			  String sha256PackageSignature = getSHA256(signatures[0]);
			  if (!(shaAppGoogleSignature.equalsIgnoreCase(sha256PackageSignature) || shaAppUploadKeySignature.equalsIgnoreCase(sha256PackageSignature))) {
				  Activity currentActivity = getCurrentActivity();
				  currentActivity.finishAndRemoveTask();
			  }
	  }
	  catch(Exception exception) {
		  Log.e("TamperCheckModule", "Exception: " + exception);
	  }
	}

  private static String getSHA256(Signature signature) {
	  try {
		  MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
		  byte[] hashText = messageDigest.digest(signature.toByteArray());
		  return bytesToHex(hashText);
	  }
	  catch(NoSuchAlgorithmException exception) {
		  Log.e("TamperCheckModule", "Invalid algorithm: " + exception);
		  return "";
	  }
	}

  private static String bytesToHex(byte[] bytes) {
  	final char[] hexArray = { '0', '1', '2', '3', '4', '5', '6', '7', '8',
				'9', 'A', 'B', 'C', 'D', 'E', 'F' };
		char[] hexChars = new char[bytes.length * 2];
		int v;
		for (int j = 0; j < bytes.length; j++) {
			v = bytes[j] & 0xFF;
			hexChars[j * 2] = hexArray[v >>> 4];
			hexChars[j * 2 + 1] = hexArray[v & 0x0F];
		}
		return new String(hexChars);
	}
}