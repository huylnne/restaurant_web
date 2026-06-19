Add-Type -AssemblyName System.Drawing

$W = 4200
$H = 3000
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$bgColor = [System.Drawing.Color]::FromArgb(235, 235, 235)
$bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
$g.FillRectangle($bgBrush, 0, 0, $W, $H)

$framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 6)
$g.DrawRectangle($framePen, 40, 40, $W - 80, $H - 80)

$titleFont = New-Object System.Drawing.Font("Arial", 42, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Bold)
$attrFont = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Bold)
$relFont = New-Object System.Drawing.Font("Arial", 19, [System.Drawing.FontStyle]::Bold)

$center = New-Object System.Drawing.StringFormat
$center.Alignment = [System.Drawing.StringAlignment]::Center
$center.LineAlignment = [System.Drawing.StringAlignment]::Center

$g.DrawString(
  "Class Diagram He Thong Quan Ly Nha Hang",
  $titleFont,
  [System.Drawing.Brushes]::Black,
  [System.Drawing.RectangleF]::new(0, 20, $W, 90),
  $center
)

function Draw-ClassBox {
  param(
    [string]$Name,
    [int]$X,
    [int]$Y,
    [string[]]$Lines
  )
  $boxW = 1050
  $boxH = 500
  $headerH = 92
  $fillBody = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 242, 170))
  $fillHead = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(236, 216, 90))
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 4)

  $g.FillRectangle($fillBody, $X, $Y, $boxW, $boxH)
  $g.FillRectangle($fillHead, $X, $Y, $boxW, $headerH)
  $g.DrawRectangle($pen, $X, $Y, $boxW, $boxH)
  $g.DrawLine($pen, $X, $Y + $headerH, $X + $boxW, $Y + $headerH)

  $g.DrawString(
    $Name,
    $nameFont,
    [System.Drawing.Brushes]::Black,
    [System.Drawing.RectangleF]::new($X, $Y, $boxW, $headerH),
    $center
  )

  $ty = $Y + 118
  foreach ($line in $Lines) {
    $g.DrawString($line, $attrFont, [System.Drawing.Brushes]::Black, $X + 22, $ty)
    $ty += 48
  }
}

function Draw-RelationPath {
  param(
    [int[]]$Pts,
    [string]$Label,
    [string]$M1,
    [string]$M2,
    [int]$LabelX,
    [int]$LabelY
  )

  if ($Pts.Length -lt 4 -or ($Pts.Length % 2) -ne 0) {
    return
  }

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 3)
  for ($i = 0; $i -le $Pts.Length - 4; $i += 2) {
    $g.DrawLine($pen, $Pts[$i], $Pts[$i + 1], $Pts[$i + 2], $Pts[$i + 3])
  }

  $sx = $Pts[0]
  $sy = $Pts[1]
  $ex = $Pts[$Pts.Length - 2]
  $ey = $Pts[$Pts.Length - 1]
  $g.DrawString($M1, $relFont, [System.Drawing.Brushes]::Black, $sx + 8, $sy - 24)
  $g.DrawString($M2, $relFont, [System.Drawing.Brushes]::Black, $ex - 64, $ey - 24)

  # Khong ve background cua nhan
  $g.DrawString($Label, $relFont, [System.Drawing.Brushes]::Black, $LabelX, $LabelY)
}

Draw-ClassBox "Branch" 120 220 @(
  "+ branch_id: int",
  "+ name: string",
  "+ address: text",
  "+ phone: string",
  "+ open_time: string",
  "+ close_time: string"
)

Draw-ClassBox "Employee" 1500 220 @(
  "+ employee_id: int",
  "+ user_id: int",
  "+ branch_id: int",
  "+ position: string",
  "+ salary: decimal",
  "+ status: enum"
)

Draw-ClassBox "User" 2880 220 @(
  "+ user_id: int",
  "+ branch_id: int?",
  "+ username: string",
  "+ full_name: string",
  "+ phone: string?",
  "+ role: enum"
)

Draw-ClassBox "Table" 120 900 @(
  "+ table_id: int",
  "+ branch_id: int",
  "+ table_number: int",
  "+ capacity: int",
  "+ status: string",
  "+ qr_token: string?"
)

Draw-ClassBox "Order" 1500 900 @(
  "+ order_id: int",
  "+ user_id: int?",
  "+ branch_id: int?",
  "+ table_id: int?",
  "+ status: string",
  "+ order_type: string",
  "+ payment_status: string"
)

Draw-ClassBox "Payment" 2880 900 @(
  "+ payment_id: int",
  "+ order_id: int [UNIQUE]",
  "+ amount: decimal",
  "+ method: string",
  "+ status: string",
  "+ transaction_ref: string?"
)

Draw-ClassBox "MenuItem" 120 1580 @(
  "+ item_id: int",
  "+ branch_id: int",
  "+ name: string",
  "+ price: decimal",
  "+ sale_price: decimal?",
  "+ category: string",
  "+ is_available: bool"
)

Draw-ClassBox "OrderItem" 1500 1580 @(
  "+ order_item_id: int",
  "+ order_id: int",
  "+ item_id: int",
  "+ quantity: int",
  "+ price: decimal",
  "+ note: string?",
  "+ status: enum"
)

Draw-ClassBox "Review" 2880 1580 @(
  "+ review_id: int",
  "+ order_id: int [UNIQUE]",
  "+ user_id: int",
  "+ rating: int",
  "+ comment: text",
  "+ created_at: datetime"
)

Draw-ClassBox "OperationLog" 1500 2260 @(
  "+ log_id: int",
  "+ user_id: int?",
  "+ branch_id: int?",
  "+ action: string",
  "+ module: string",
  "+ entity_type: string?",
  "+ entity_id: int?"
)

Draw-RelationPath @(1170, 290, 1260, 290, 1260, 200, 1980, 200, 1980, 220) "employs" "1" "0..*" 1590 170
Draw-RelationPath @(1170, 350, 1240, 350, 1240, 170, 3400, 170, 3400, 220) "has users" "1" "0..*" 2240 140
Draw-RelationPath @(300, 720, 300, 900) "has tables" "1" "0..*" 308 800
Draw-RelationPath @(200, 720, 70, 720, 70, 1830, 120, 1830) "offers menu" "1" "0..*" 80 1260
Draw-RelationPath @(1170, 640, 1400, 640, 1400, 1160, 1500, 1160) "has orders" "1" "0..*" 1410 900
Draw-RelationPath @(2550, 540, 2880, 540) "linked" "1" "1" 2680 510
Draw-RelationPath @(3400, 720, 3400, 900) "creates" "1" "0..*" 3410 800
Draw-RelationPath @(1170, 1150, 1500, 1150) "assigned_to" "1" "0..*" 1280 1120
Draw-RelationPath @(2025, 1400, 2025, 1580) "contains" "1" "1..*" 2034 1480
Draw-RelationPath @(1170, 1830, 1500, 1830) "selected_as" "1" "0..*" 1250 1800
Draw-RelationPath @(2550, 1120, 2880, 1120) "paid_by" "1" "0..1" 2660 1090
Draw-RelationPath @(2550, 1240, 2700, 1240, 2700, 1830, 2880, 1830) "reviewed_by" "1" "0..1" 2710 1530
Draw-RelationPath @(3930, 540, 4040, 540, 4040, 1830, 3930, 1830) "writes" "1" "0..*" 3960 1220
Draw-RelationPath @(3200, 720, 3200, 2510, 2550, 2510) "audits" "1" "0..*" 3210 1600

$outPath = "d:\DATN\restaurant_web\docs\Chuong\BDQH.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Output "saved $outPath"
