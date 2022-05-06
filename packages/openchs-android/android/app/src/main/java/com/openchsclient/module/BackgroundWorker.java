package com.openchsclient.module;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;

import android.util.Log;
import androidx.annotation.NonNull;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import androidx.work.Data;
import androidx.work.RxWorker;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.CatalystInstance;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Map;

import com.openchsclient.MainApplication;
import io.reactivex.Single;

public class BackgroundWorker extends Worker {

    private Map<String, Object> worker;
    private String id;

    public BackgroundWorker(@androidx.annotation.NonNull Context appContext, @androidx.annotation.NonNull WorkerParameters workerParams) {
        super(appContext, workerParams);
        worker = workerParams.getInputData().getKeyValueMap();
        id = workerParams.getId().toString();
    }

    @NonNull
    @Override
    public Result doWork() {
        MainApplication application = (MainApplication) getApplicationContext();
        ReactNativeHost reactNativeHost = application.getReactNativeHost();
        ReactInstanceManager reactInstanceManager = reactNativeHost.getReactInstanceManager();
        ReactContext reactContext = reactInstanceManager.getCurrentReactContext();
        if (reactContext != null) {
            CatalystInstance catalystInstance = reactContext.getCatalystInstance();
            WritableNativeArray params = new WritableNativeArray();
            params.pushString("Hello, JavaScript!");
            catalystInstance.callFunction("JavaScriptVisibleToJava", "test", params);
        }
        return Result.success();
    }


//    @androidx.annotation.NonNull
//    @Override
//    public Single<Result> createWork() {
//
//        if(BackgroundWorkerModule.context==null)
//            return Single.just(Result.retry());
//
//        String name = (String) worker.get("name");
//        String payload = (String) worker.get("payload");
//
//        if(name==null)
//            return Single.just(Result.failure());
//
//        Bundle extras = new Bundle();
//        extras.putString("id", id);
//        if(payload!=null) extras.putString("payload",payload);
//
//        BackgroundWorkerModule.context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
//                .emit(name, Arguments.fromBundle(extras));
//
//        return Single.create(emitter -> {
//            BroadcastReceiver receiver = new BroadcastReceiver() {
//                @Override
//                public void onReceive(Context context, Intent intent) {
//                    String value = intent.getStringExtra("value");
//                    String result = intent.getStringExtra("result");
//                    Data outputData = new Data.Builder()
//                            .putString("value", value)
//                            .build();
//                    switch (result) {
//                        case "success":
//                            emitter.onSuccess(Result.success(outputData));
//                            break;
//                        case "retry":
//                            emitter.onSuccess(Result.retry());
//                            break;
//                        default:
//                            emitter.onSuccess(Result.failure(outputData));
//                    }
//                }
//            };
//            LocalBroadcastManager.getInstance(BackgroundWorkerModule.context).registerReceiver(receiver,new IntentFilter(id+"result"));
//        });
//    }
}
