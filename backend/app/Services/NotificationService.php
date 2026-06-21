<?php

namespace App\Services;

use App\Mail\SystemNotificationMail;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Parse the SMTP Notification Matrix and check if a specific key is enabled.
     */
    public static function isNotificationEnabled($matrixKey): bool
    {
        $enabled = Setting::getValue('enable_email_notifications');
        if ($enabled === 'false' || $enabled === false || $enabled === '0' || $enabled === 0) {
            return false;
        }

        $matrixStr = Setting::getValue('smtp_notification_matrix');
        if (empty($matrixStr)) {
            return false;
        }

        $matrix = json_decode($matrixStr, true);
        if (! is_array($matrix)) {
            return false;
        }

        if (! isset($matrix[$matrixKey])) {
            return false;
        }

        // Old boolean format fallback
        if (is_bool($matrix[$matrixKey])) {
            return $matrix[$matrixKey];
        }

        // New object format
        return isset($matrix[$matrixKey]['enabled']) && $matrix[$matrixKey]['enabled'] == true;
    }

    /**
     * Send a dynamic email if the matrix key is enabled.
     * Evaluates CC, Roles, and Context Data for conditional routing.
     */
    public static function sendDynamicEmail($toEmail, $subject, $templateKey, $matrixKey, $placeholders = [], $contextData = [])
    {
        if (! self::isNotificationEnabled($matrixKey)) {
            Log::info("Notification Skipped: {$matrixKey} is disabled in matrix.");

            return false;
        }

        $template = Setting::getValue($templateKey);
        if (! $template) {
            Log::warning("Notification Skipped: Template {$templateKey} not found.");

            return false;
        }

        // Replace placeholders
        $body = $template;
        foreach ($placeholders as $key => $value) {
            $body = str_replace('{'.$key.'}', $value, $body);
        }

        // Process Matrix Rules (CC, Roles, Conditionals)
        $ccEmails = [];
        $bccEmails = [];

        $matrixStr = Setting::getValue('smtp_notification_matrix');
        $matrix = json_decode($matrixStr, true);

        if (isset($matrix[$matrixKey]) && is_array($matrix[$matrixKey])) {
            $ruleData = $matrix[$matrixKey];

            // 1. Process Default CC
            if (! empty($ruleData['cc_emails'])) {
                $emails = array_map('trim', explode(',', $ruleData['cc_emails']));
                $ccEmails = array_merge($ccEmails, $emails);
            }

            // 2. Process Default Roles (put in BCC to avoid massive CC list)
            if (! empty($ruleData['notify_roles']) && is_array($ruleData['notify_roles'])) {
                $users = User::role($ruleData['notify_roles'])->pluck('email')->toArray();
                $bccEmails = array_merge($bccEmails, $users);
            }

            // 3. Process Conditional Rules
            if (! empty($ruleData['conditional_rules']) && is_array($ruleData['conditional_rules'])) {
                foreach ($ruleData['conditional_rules'] as $cond) {
                    $field = $cond['trigger_field'] ?? null;
                    $value = $cond['trigger_value'] ?? null;

                    if ($field && $value && isset($contextData[$field]) && strtolower($contextData[$field]) === strtolower($value)) {
                        // Condition matched
                        if (! empty($cond['additional_cc'])) {
                            $emails = array_map('trim', explode(',', $cond['additional_cc']));
                            $ccEmails = array_merge($ccEmails, $emails);
                        }
                        if (! empty($cond['additional_roles']) && is_array($cond['additional_roles'])) {
                            $users = User::role($cond['additional_roles'])->pluck('email')->toArray();
                            $bccEmails = array_merge($bccEmails, $users);
                        }
                    }
                }
            }
        }

        // Clean arrays
        $ccEmails = array_unique(array_filter($ccEmails));
        $bccEmails = array_unique(array_filter($bccEmails));

        // Remove the main recipient from CC or BCC just in case (if not null)
        if ($toEmail) {
            $ccEmails = array_diff($ccEmails, [$toEmail]);
            $bccEmails = array_diff($bccEmails, [$toEmail]);
        }

        try {
            // If toEmail is null, use the first CC or BCC as the toEmail, or fallback to system email
            if (empty($toEmail)) {
                if (count($ccEmails) > 0) {
                    $toEmail = array_shift($ccEmails);
                } elseif (count($bccEmails) > 0) {
                    $toEmail = array_shift($bccEmails);
                } else {
                    Log::warning("Notification Skipped: No recipient found for {$matrixKey}.");

                    return false;
                }
            }

            $mail = Mail::to($toEmail);

            if (count($ccEmails) > 0) {
                $mail->cc($ccEmails);
            }
            if (count($bccEmails) > 0) {
                $mail->bcc($bccEmails);
            }

            $mail->send(new SystemNotificationMail($subject, $body));

            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send email to {$toEmail}: ".$e->getMessage());

            return false;
        }
    }
}
