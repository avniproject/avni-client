package com.openchsclient.module;
//Credits: https://www.qed42.com/insights/coe/javascript/react-native-endless-background-process
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.facebook.react.HeadlessJsTaskService;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        context.startService(new Intent(context, BackgroundJobService.class));
        HeadlessJsTaskService.acquireWakeLockNow(context);
    }

}
