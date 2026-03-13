package com.leadwave;

import android.content.Intent;
import android.os.Bundle;
import android.app.Notification;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class IncomingCallLookupTaskService extends HeadlessJsTaskService {

    @Override
    public void onCreate() {
        super.onCreate();
        Notification notification = NotificationHelper.createNotification(
                this,
                "Leadwave caller identification",
                "Identifying caller..."
        );
        startForeground(3, notification);
    }

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                "IncomingCallLookupTask",
                Arguments.fromBundle(extras),
                10000, // Timeout for the task (10 seconds) - must be fast for caller ID
                true // Allowed in foreground (and background)
            );
        }
        return null;
    }
}
