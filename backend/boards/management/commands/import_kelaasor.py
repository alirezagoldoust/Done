# -*- coding: utf-8 -*-
"""Import the 30 tasks from the kelaasor todo list into a new board.

Each task is placed into a Backend or Frontend column based on its content.
Long items keep a concise card title with the full text in the description.
Re-running replaces the board so the import stays idempotent.
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from boards.models import Board
from boards.services import add_member, create_board_with_defaults
from tasks.services import create_task

BOARD_NAME = "Kelaasor Bootcamp"

# (text, category) in original list order. category: "Backend" | "Frontend"
TASKS = [
    ("دکمه‌ی ثبت نام موفق بره به داخل مراحل ثبت نام (اولین فرم)", "Frontend"),
    ("یوزر بعد از ثبت نام بره داخل مرحله تکمیل اطلاعات و بعد در حال بررسی بشه (که ادمین تایید کنه یا نه). درواقع مرحله اول و دوم switch میشن.", "Frontend"),
    ("اطلاعاتی که از کاربر باید بگیریم: نام و نام خانوادگی انگلیسی، سابقه مرتبط، تاریخ تولد، آخرین مقطع تحصیلی، رشته تحصیلی، آدرس منزل، Linkedin (اختیاری)", "Backend"),
    ("نوتیف خوشآمد گویی و درخواست تکمیل اطلاعات یک متن بشه.", "Backend"),
    ("بعد از تکمیل اطلاعات بهش بگه که قراره کارشناسا بررسی کنن", "Frontend"),
    ("داخل مرحله سوم اول بپرسیم قراره نقدی پرداخت کنه یا قسطی. اگر نقدی بود یک رسید فقط آپلود می‌کنه (قیمت‌هارو هم دقیق و شفاف باید به یوزر بگیم). و اگر قسطی انتخاب کرد اول عکس چک رو می‌گیریم، دوم شماره چک صیادی رو وارد کنه (یک توضیحی هم بنویسیم برای یوزر، یک راهنما باشه که بگو شماره صیادی کجای چکه). حتما باید چک رو ثبت کنه داخل سامانه بانکی و ادمین هم باید بره داخل سامانه چک رو دریافت کنه. اگر اوکی بود تایید بشه اگر نه هم پیام بره که چک رو ثبت نکرده. یک تیک داخل مرحله قبلیش گذاشته بشه که داخل سامانه ثبت کرده. خود آپلود رسید بشه 2 مرحله، آپلود رسید، آپلود قسط اول. 30 روز بعدش بهش بگیم بیا قسط بعدی رو پرداخت کن. (همه چیز مثل اسنپ پی شفاف بشه). و ارسال sms هم برای هر مرحله داشته باشیم.", "Backend"),
    ("جزئیات بوتکمپ: باتن ورود به سامانه بیاد داخل sidebar. زمان‌بندی جلسات مثل تقویم باشه با جزئیات و خفن. سرتیفیکیت‌های user داخل sidebar اضافه بشه.", "Frontend"),
    ("داخل جزئیات حساب عکس رو بگیریم.", "Frontend"),
    ("یک سری بوتکمپ‌های برگزار شده را وارد کنیم.", "Backend"),
    ("بررسی سایت Linear برای واکا", "Frontend"),
    ("داخل جزئیات حساب بتونه اطلاعاتش رو edit کنه", "Frontend"),
    ("داخل certificate، عکس و لینک و باتن share داشته باشیم. (آموزش گذاشتن certificate داخل لینکدین رو به یوزر آموزش بدیم. که یک pop up toturial چند مرحله‌ای باشه.", "Frontend"),
    ("MPS و تستیمونیال", "Frontend"),
    ("«پرداخت‌ها» به sidebar اضافه بشه. زمانی که رسیدیم به موعد دومین پرداخت، یک Alert به یوزر نشون بدیم روی سایت.", "Frontend"),
    ("یک چک به مبلغ کل هست و 4 رسید. و در آخر باید چک رو بهش پس بدیم.", "Backend"),
    ("اسم و کد ملی و تاریخ چک (که متغیر است) رو باید به یوزر بگیم.", "Backend"),
    ("یک نوتیف بهش بدیم که روز اول چک رو با خودش بیاره", "Backend"),
    ("یکی دو روز قبل از شروع بوتکمپ یه نوتیف یادآوری باحال بهش بدیم.", "Backend"),
    ("یک مرحله داشته باشیم که بگیم اصل چک یوزر رسیده بهمون.", "Backend"),
    ("کارت‌های صفحه اول بچرخه. اون بالای کادر بالای کارت بوتکمپ که می‌چرخه تبدیل بشه به تستیمونیال‌ها", "Frontend"),
    ("+800 / +40 / +30 / +98%", "Frontend"),
    ("همراهان کلاسور تبدیل بشه به جاهایی که شرکت‌کننده‌ها استخدام شدن.", "Frontend"),
    ("تمام lead ها و دیتای یوزرهای قبلی منتقل بشه به این سایت.", "Backend"),
    ("سرتیفیکیت‌ها منوط بشه به شرکت در نظرسنجی.", "Backend"),
    ("بعدا می‌تونیم gamification اضافه کنیم به ازای اکشن های مختلف.", "Backend"),
    ("می‌تونیم یه chat اضافه کنیم به صفحه bootcampها که یوزر مشورت بگیره و اینا.", "Frontend"),
    ("همه‌چیز که تموم شد مانی بره روی پنل ادمین", "Backend"),
    ("اگر اسپانسر نداشتیم اون سکشن حذف بشه کامل.", "Frontend"),
    ("لوگوهای مدرس‌ها فیکس بشن.", "Frontend"),
    ("کامنت‌ها کاروسل باشه.", "Frontend"),
]

TITLE_LIMIT = 130


def split_title(text: str) -> tuple[str, str]:
    """Return (title, description). Long items get a short title + full text."""
    if len(text) <= TITLE_LIMIT:
        return text, ""
    head = text[:TITLE_LIMIT].rsplit(" ", 1)[0].rstrip("،, ")
    return f"{head}…", text


class Command(BaseCommand):
    help = "Import the kelaasor todo tasks into a Backend/Frontend board."

    def handle(self, *args, **options):
        # Replace any previous import so the command is idempotent.
        Board.objects.filter(name=BOARD_NAME).delete()

        board = create_board_with_defaults(
            name=BOARD_NAME,
            description="Bootcamp platform tasks, categorised by Backend / Frontend.",
            columns=["Backend", "Frontend"],
        )

        columns = {c.name: c for c in board.columns.all()}
        first_status = board.statuses.order_by("position", "id").first()

        # Make the board visible to the demo users and any superuser.
        members = list(
            User.objects.filter(username__in=["alice", "bob", "carol"])
        ) + list(User.objects.filter(is_superuser=True))
        seen = set()
        for user in members:
            if user.id in seen:
                continue
            seen.add(user.id)
            add_member(board, user)

        counts = {"Backend": 0, "Frontend": 0}
        for text, category in TASKS:
            title, description = split_title(text)
            create_task(
                board=board,
                column=columns[category],
                status=first_status,
                title=title,
                description=description,
            )
            counts[category] += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {len(TASKS)} tasks into '{BOARD_NAME}' "
                f"(Backend: {counts['Backend']}, Frontend: {counts['Frontend']})."
            )
        )
        self.stdout.write(
            f"Members: {', '.join(sorted(u.username for u in members)) or 'none'}"
        )
