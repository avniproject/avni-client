
package com.openchsclient.module;

import android.app.job.JobInfo;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.Observer;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.Operation;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;
import androidx.work.WorkRequest;

import com.openchsclient.module.Parser;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.common.util.concurrent.ListenableFuture;

import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import javax.annotation.Nonnull;

import static androidx.work.Operation.State;

public class BackgroundWorkerModule extends ReactContextBaseJavaModule {

    static ReactApplicationContext context;

    BackgroundWorkerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        context = reactContext;
    }

    @Nonnull
    @Override
    public String getName() {
        return "BackgroundWorker";
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
    }


    @ReactMethod
    public void registerWorker(ReadableMap worker, ReadableMap constraints, Promise p) {
        String name = worker.getString("name");

        if(name == null) {
            p.reject("ERROR", "missing worker info");
            return;
        }
        int repeatInterval = worker.getInt("repeatInterval");
        Constraints _constraints = Parser.getConstraints(constraints);

        PeriodicWorkRequest.Builder builder = new PeriodicWorkRequest.Builder(BackgroundWorker.class, Math.max(15, repeatInterval), TimeUnit.MINUTES);
        if(_constraints!=null) builder.setConstraints(_constraints);

        Data inputData = new Data.Builder()
                .putAll(worker.toHashMap())
                .build();

        builder.setInputData(inputData);
        PeriodicWorkRequest request = builder.build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(name, ExistingPeriodicWorkPolicy.REPLACE, request);
        p.resolve(request.getId().toString());

    }

    @ReactMethod
    public void result(String id, String value, String result) {
        Intent intent = new Intent(id + "result");
        intent.putExtra("result", result);
        intent.putExtra("value", value);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }

    @ReactMethod
    public void startHeadlessTask(ReadableMap workConfiguration) {
        Intent headlessIntent = new Intent(context, BackgroundWorkerService.class);
        Bundle extras = Arguments.toBundle(workConfiguration);
        if(extras!=null) headlessIntent.putExtras(extras);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
            BackgroundWorkerModule.this.getReactApplicationContext().startForegroundService(headlessIntent);
        else BackgroundWorkerModule.this.getReactApplicationContext().startService(headlessIntent);
    }

}
