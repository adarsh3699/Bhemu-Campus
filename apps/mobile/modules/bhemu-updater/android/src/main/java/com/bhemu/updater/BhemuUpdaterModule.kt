package com.bhemu.updater

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BhemuUpdaterModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("BhemuUpdater")
    
    Events("onDownloadComplete")

    AsyncFunction("downloadApk") { url: String, filename: String, title: String, description: String, mimeType: String ->
      val context = appContext.reactContext ?: throw Exception("React context is not available")
      val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val uri = Uri.parse(url)
      
      val request = DownloadManager.Request(uri).apply {
        setTitle(title)
        setDescription(description)
        setMimeType(mimeType)
        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
      }
      
      val downloadId = downloadManager.enqueue(request)

      if (receiver == null) {
        receiver = object : BroadcastReceiver() {
          override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == DownloadManager.ACTION_DOWNLOAD_COMPLETE) {
              val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
              val query = DownloadManager.Query().setFilterById(id)
              val cursor = downloadManager.query(query)
              if (cursor.moveToFirst()) {
                val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                if (statusIndex >= 0 && cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL) {
                  val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                  if (uriIndex >= 0) {
                    val localUri = cursor.getString(uriIndex)
                    sendEvent("onDownloadComplete", Bundle().apply {
                      putLong("downloadId", id)
                      putString("uri", localUri)
                    })
                  }
                }
              }
              cursor.close()
            }
          }
        }
        ContextCompat.registerReceiver(
          context,
          receiver,
          IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
          ContextCompat.RECEIVER_EXPORTED
        )
      }
      
      return@AsyncFunction downloadId
    }

    OnDestroy {
      receiver?.let {
        appContext.reactContext?.unregisterReceiver(it)
        receiver = null
      }
    }
  }
}
