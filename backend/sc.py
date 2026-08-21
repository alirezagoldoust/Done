

from tasks.models import *
Task.objects.filter(column_id=30, status_id=34, board_id=9).update(column_id=38, status_id=47, board_id=12)