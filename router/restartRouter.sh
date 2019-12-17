#!/bin/sh 
echo "Starting Parser App"
EXEC_DIR=/var/data/runtime/nodeApp
APPNAME=router
LOGDIR=/var/log/serviceRepo
#Clean any files older than 10 days
find $LOGDIR -type f -mtime +10 -name "*$APPNAME*.gz" -delete
for i in $LOGDIR/*$APPNAME.log; do
    # Process $i
    FILENAME=$LOGDIR/$(date +"%Y-%m-%d-%H:%M:%S.%N").$APPNAME.gz
    echo "Gzipping $i to $FILENAME"
    gzip -c $i > $FILENAME
    chmod 777 $FILENAME
done
echo "### Starting parser App at $(date +'%Y-%m-%d-%H:%M:%S.%N')###" > $LOGDIR/$APPNAME.log
chmod 777 $LOGDIR/$APPNAME.log
#killall $APPNAME || true
cd $EXEC_DIR
pm2 stop $APPNAME
pm2 start ./$APPNAME --name $APPNAME
#nohup ./$APPNAME >> $LOGDIR/$APPNAME.log 2>&1&
