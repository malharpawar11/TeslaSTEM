# Canvas announcements and messaging retirement

Leaders open the club management page and choose **Announcements → Add Canvas announcement link**. School admins can add school-wide links from the admin page. Publish the announcement in Canvas first, then copy the link to the individual post and give it a short title. Course and group announcement permalinks on HTTPS Instructure hosts are accepted. Sharing the link does not enroll anyone or grant Canvas access; Canvas controls who can open the post and who receives notifications.

The club site stores only the link and its title. Changes to the announcement body are made in Canvas. Removing the link here does not delete the Canvas post. No Canvas API key or course-wide configuration is required.

Deployment: apply `20261107120000_canvas-announcements-retire-messaging.sql` to each backend serving the updated site. It prevents older clients from posting standalone announcements or calling messaging endpoints. Historical message and standalone announcement rows are retained in the database and are inaccessible to student app roles. Event notifications and calendar updates are unaffected.
