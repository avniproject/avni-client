//package com.openchsclient.module;
//
//import android.content.Context;
//import android.content.Intent;
//import androidx.work.PeriodicWorkRequest;
//import androidx.work.WorkManager;
//import androidx.work.impl.utils.ForceStopRunnable;
//
//import java.util.concurrent.TimeUnit;
//
//public class WorkManagerStartReceiver extends ForceStopRunnable.BroadcastReceiver {
//    WorkManager mWorkManager;
//
//    @Override
//    public void onReceive(Context context, Intent intent) {
//
//        PeriodicWorkRequest.Builder myWorkBuilder =
//                new PeriodicWorkRequest.Builder(BackgroundWorker.class,
//                        PeriodicWorkRequest.MIN_PERIODIC_INTERVAL_MILLIS,
//                        TimeUnit.MILLISECONDS);
//
//        PeriodicWorkRequest myWork = myWorkBuilder.build();
//        mWorkManager = WorkManager.getInstance(context);
//        mWorkManager.enqueue(myWork);
//
//    }
//}
