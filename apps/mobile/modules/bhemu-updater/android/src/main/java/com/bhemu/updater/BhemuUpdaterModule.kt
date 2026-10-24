package com.bhemu.updater

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BhemuUpdaterModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private fun statusName(status: Int): String = when (status) {
    DownloadManager.STATUS_PENDING -> "pending"
    DownloadManager.STATUS_RUNNING -> "running"
    DownloadManager.STATUS_SUCCESSFUL -> "successful"
    DownloadManager.STATUS_FAILED -> "failed"
    DownloadManager.STATUS_PAUSED -> "paused"
    else -> "unknown"
  }

  private fun getDownloadStatus(downloadManager: DownloadManager, downloadId: Long): Bundle? {
    val cursor = downloadManager.query(DownloadManager.Query().setFilterById(downloadId))
    cursor.use {
      if (!it.moveToFirst()) return null

      val statusIndex = it.getColumnIndex(DownloadManager.COLUMN_STATUS)
      if (statusIndex < 0) return null

      val status = it.getInt(statusIndex)
      val result = Bundle().apply {
        putLong("downloadId", downloadId)
        putString("status", statusName(status))
      }

      if (status == DownloadManager.STATUS_SUCCESSFUL) {
        // getUriForDownloadedFile returns a content:// URI that the Android
        // package installer can read. COLUMN_LOCAL_URI can be file:// when a
        // public Downloads destination is used and is not installable on
        // modern Android versions.
        val installUri = downloadManager.getUriForDownloadedFile(downloadId)
        if (installUri != null) {
          result.putString("uri", installUri.toString())
        }
      }

      return result
    }
  }

  private fun registerDownloadReceiver(context: Context, downloadManager: DownloadManager) {
    if (receiver != null) return

    receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return

        val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
        if (id < 0) return

        val status = getDownloadStatus(downloadManager, id) ?: return
        if (status.getString("status") == "successful" && status.getString("uri") != null) {
          sendEvent("onDownloadComplete", status)
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

  override fun definition() = ModuleDefinition {
    Name("BhemuUpdater")
    
    Events("onDownloadComplete")

    AsyncFunction("downloadApk") { url: String, filename: String, title: String, description: String, mimeType: String ->
      val context = appContext.reactContext ?: throw Exception("React context is not available")
      val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val uri = Uri.parse(url)

      // Register before enqueueing so a very fast/cached download cannot
      // complete before JavaScript has a receiver attached.
      registerDownloadReceiver(context, downloadManager)
      
      val request = DownloadManager.Request(uri).apply {
        setTitle(title)
        setDescription(description)
        setMimeType(mimeType)
        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
      }
      
      val downloadId = downloadManager.enqueue(request)
      return@AsyncFunction downloadId
    }

    AsyncFunction("canInstallPackages") {
      val context = appContext.reactContext ?: throw Exception("React context is not available")
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        true
      } else {
        context.packageManager.canRequestPackageInstalls()
      }
    }

    AsyncFunction("getDownloadStatus") { downloadId: Long ->
      val context = appContext.reactContext ?: throw Exception("React context is not available")
      val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      getDownloadStatus(downloadManager, downloadId)
    }

    OnDestroy {
      receiver?.let {
        appContext.reactContext?.unregisterReceiver(it)
        receiver = null
      }
    }
  }
}
