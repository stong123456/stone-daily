param(
  [switch]$Watch
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimeDirectory = Join-Path $projectRoot 'data\runtime'
$cachePath = Join-Path $runtimeDirectory 'tokenized-stocks.json'
$temporaryPath = Join-Path $runtimeDirectory 'tokenized-stocks.tmp.json'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$stockNames = @{
  AAPL = '苹果'; AMZN = '亚马逊'; GOOGL = 'Alphabet'; META = 'Meta'; MSFT = '微软';
  NVDA = '英伟达'; QQQ = '纳斯达克 100 ETF'; SPY = '标普 500 ETF'; TSLA = '特斯拉'
}

function Convert-Number($value) {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return 0 }
  $parsed = 0.0
  if ([double]::TryParse([string]$value, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) { return $parsed }
  return 0
}

function Get-TokenName([string]$ticker) {
  if ($stockNames.ContainsKey($ticker)) { return "$($stockNames[$ticker]) 币股" }
  return "$ticker 币股"
}

function Sync-TokenizedStocks {
  $assets = [System.Collections.Generic.List[object]]::new()
  $providers = [System.Collections.Generic.List[object]]::new()

  try {
    $symbols = Invoke-RestMethod -Uri 'https://api.bitget.com/api/v2/spot/public/symbols'
    $tickers = Invoke-RestMethod -Uri 'https://api.bitget.com/api/v2/spot/market/tickers'
    $tickerMap = @{}
    foreach ($ticker in $tickers.data) { $tickerMap[$ticker.symbol] = $ticker }
    $count = 0
    foreach ($item in $symbols.data) {
      if ($item.baseCoin -cnotmatch '^r[A-Z0-9]' -or $item.quoteCoin -ne 'USDT' -or $item.status -ne 'online') { continue }
      $ticker = $tickerMap[$item.symbol]
      $price = Convert-Number $ticker.lastPr
      if ($price -le 0) { continue }
      $underlying = $item.baseCoin.Substring(1).ToUpperInvariant()
      $change = (Convert-Number $ticker.change24h) * 100
      $assets.Add([pscustomobject]@{
        id = "bitget-$($item.symbol.ToLowerInvariant())"; name = Get-TokenName $underlying; symbol = $item.baseCoin;
        price = $price; change24h = $change; volume = Convert-Number $ticker.quoteVolume; marketCap = 0;
        narrative = 'Bitget rToken 现货'; aiTag = $(if ([Math]::Abs($change) -ge 8) { '高波动' } else { '币股现货' });
        aiHint = '这是与基础股票挂钩的代币化经济敞口，不等同于直接持有登记股票。'; volumeChange = 0;
        market = 'stock'; venue = 'Bitget'; sector = '币股现货'
      })
      $count++
    }
    $providers.Add([pscustomobject]@{ name = 'Bitget'; product = 'rToken 现货'; count = $count; status = 'live' })
  } catch {
    $providers.Add([pscustomobject]@{ name = 'Bitget'; product = 'rToken 现货'; count = 0; status = 'unavailable' })
  }

  try {
    $instruments = Invoke-RestMethod -Uri 'https://api.bybit.com/v5/market/instruments-info?category=spot&symbolType=xstocks'
    $tickers = Invoke-RestMethod -Uri 'https://api.bybit.com/v5/market/tickers?category=spot'
    $tickerMap = @{}
    foreach ($ticker in $tickers.result.list) { $tickerMap[$ticker.symbol] = $ticker }
    $count = 0
    foreach ($item in $instruments.result.list) {
      if ($item.symbolType -ne 'xstocks' -or $item.status -ne 'Trading') { continue }
      $ticker = $tickerMap[$item.symbol]
      $price = Convert-Number $ticker.lastPrice
      if ($price -le 0) { continue }
      $underlying = ([string]$item.baseCoin -replace 'X$', '').ToUpperInvariant()
      $multiplier = Convert-Number $item.xstockMultiplier
      if ($multiplier -le 0) { $multiplier = 1 }
      $change = (Convert-Number $ticker.price24hPcnt) * 100
      $assets.Add([pscustomobject]@{
        id = "bybit-$($item.symbol.ToLowerInvariant())"; name = Get-TokenName $underlying; symbol = $item.baseCoin;
        price = $price; change24h = $change; volume = Convert-Number $ticker.turnover24h; marketCap = 0;
        narrative = "Bybit xStocks · $($item.quoteCoin) 现货"; aiTag = 'xStocks 现货';
        aiHint = "Bybit 标注的换算倍数为 $multiplier；基础股价与代币价需要按平台倍数换算，且代币不等同于登记股票。";
        volumeChange = 0; market = 'stock'; venue = 'Bybit'; sector = '币股现货'; productType = 'tokenized-spot';
        quoteCurrency = $item.quoteCoin; underlying = $underlying
      })
      $count++
    }
    $providers.Add([pscustomobject]@{ name = 'Bybit'; product = 'xStocks 现货'; count = $count; status = 'live' })
  } catch {
    $providers.Add([pscustomobject]@{ name = 'Bybit'; product = 'xStocks 现货'; count = 0; status = 'unavailable' })
  }

  try {
    $pairs = Invoke-RestMethod -Uri 'https://api.kraken.com/0/public/AssetPairs?assetVersion=1&aclass_base=tokenized_asset'
    $tickers = Invoke-RestMethod -Uri 'https://api.kraken.com/0/public/Ticker?assetVersion=1'
    $tickerMap = @{}
    foreach ($property in $tickers.result.PSObject.Properties) {
      $normalized = ($property.Name -replace '[^A-Za-z0-9]', '').ToUpperInvariant()
      $tickerMap[$normalized] = $property.Value
    }
    $count = 0
    foreach ($property in $pairs.result.PSObject.Properties) {
      $item = $property.Value
      if ($item.aclass_base -ne 'tokenized_asset' -or ($item.status -and $item.status -ne 'online')) { continue }
      $ticker = $null
      foreach ($candidate in @($property.Name, $item.altname, $item.wsname)) {
        if ([string]::IsNullOrWhiteSpace([string]$candidate)) { continue }
        $normalized = ([string]$candidate -replace '[^A-Za-z0-9]', '').ToUpperInvariant()
        if ($tickerMap.ContainsKey($normalized)) { $ticker = $tickerMap[$normalized]; break }
      }
      if ($null -eq $ticker) { continue }
      $price = Convert-Number $ticker.c[0]
      if ($price -le 0) { continue }
      $open = Convert-Number $ticker.o
      $change = $(if ($open -gt 0) { (($price - $open) / $open) * 100 } else { 0 })
      $underlying = ([string]$item.base -replace 'x$', '').ToUpperInvariant()
      $assets.Add([pscustomobject]@{
        id = "kraken-$(($property.Name -replace '[^A-Za-z0-9]', '').ToLowerInvariant())"; name = Get-TokenName $underlying; symbol = $item.base;
        price = $price; change24h = $change; volume = (Convert-Number $ticker.v[1]) * $price; marketCap = 0;
        narrative = "Kraken xStocks · $($item.quote) 现货"; aiTag = '1:1 支持资产';
        aiHint = 'Kraken 表述为由基础资产 1:1 支持的 xStocks；持有者不因此获得传统股东投票权，且地区可用性受限。';
        volumeChange = 0; market = 'stock'; venue = 'Kraken'; sector = '币股现货'; productType = 'tokenized-spot';
        quoteCurrency = $item.quote; underlying = $underlying
      })
      $count++
    }
    $providers.Add([pscustomobject]@{ name = 'Kraken'; product = 'xStocks 现货'; count = $count; status = 'live' })
  } catch {
    $providers.Add([pscustomobject]@{ name = 'Kraken'; product = 'xStocks 现货'; count = 0; status = 'unavailable' })
  }

  try {
    $instruments = Invoke-RestMethod -Uri 'https://www.okx.com/api/v5/public/instruments?instType=SWAP'
    $tickers = Invoke-RestMethod -Uri 'https://www.okx.com/api/v5/market/tickers?instType=SWAP'
    $tickerMap = @{}
    foreach ($ticker in $tickers.data) { $tickerMap[$ticker.instId] = $ticker }
    $count = 0
    foreach ($item in $instruments.data) {
      if ($item.instCategory -ne '3' -or $item.state -ne 'live') { continue }
      $ticker = $tickerMap[$item.instId]
      $price = Convert-Number $ticker.last
      if ($price -le 0) { continue }
      $underlying = $item.instId -replace '-USDT-SWAP$', ''
      $open = Convert-Number $ticker.open24h
      $change = $(if ($open -gt 0) { (($price - $open) / $open) * 100 } else { 0 })
      $assets.Add([pscustomobject]@{
        id = "okx-$($item.instId.ToLowerInvariant())"; name = "$(Get-TokenName $underlying)永续"; symbol = $underlying;
        price = $price; change24h = $change; volume = Convert-Number $ticker.volCcy24h; marketCap = 0;
        narrative = 'OKX 币股永续'; aiTag = '永续合约';
        aiHint = '这是合约价格敞口，不是股票或链上现货；需额外注意资金费率、杠杆和爆仓风险。'; volumeChange = 0;
        market = 'stock'; venue = 'OKX'; sector = '币股永续'
      })
      $count++
    }
    $providers.Add([pscustomobject]@{ name = 'OKX'; product = '币股永续'; count = $count; status = 'live' })
  } catch {
    $providers.Add([pscustomobject]@{ name = 'OKX'; product = '币股永续'; count = 0; status = 'unavailable' })
  }

  try {
    $headers = @{ 'Accept-Encoding' = 'identity'; 'User-Agent' = 'binance-web3/1.1 (Skill)' }
    $list = Invoke-RestMethod -Uri 'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=1' -Headers $headers
    $listingMap = @{}
    foreach ($listing in $list.data) {
      if (-not $listingMap.ContainsKey($listing.ticker) -or $listing.chainId -eq '56') { $listingMap[$listing.ticker] = $listing }
    }
    $featured = @('AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'QQQ')
    foreach ($tickerName in $featured) {
      if (-not $listingMap.ContainsKey($tickerName)) { continue }
      $listing = $listingMap[$tickerName]
      $address = [Uri]::EscapeDataString([string]$listing.contractAddress)
      $uri = "https://www.binance.com/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai?chainId=$($listing.chainId)&contractAddress=$address"
      try {
        $dynamic = Invoke-RestMethod -Uri $uri -Headers $headers
        $token = $dynamic.data.tokenInfo
        $price = Convert-Number $token.price
        if ($price -le 0) { continue }
        $multiplier = Convert-Number $token.sharesMultiplier
        if ($multiplier -le 0) { $multiplier = Convert-Number $listing.multiplier }
        $assets.Add([pscustomobject]@{
          id = "binance-rwa-$($tickerName.ToLowerInvariant())"; name = "$(Get-TokenName $tickerName)链上版"; symbol = $dynamic.data.symbol;
          price = $price; change24h = Convert-Number $token.priceChangePct24h; volume = 0; marketCap = 0;
          narrative = 'Binance Web3 · Ondo'; aiTag = '链上币股';
          aiHint = "代币不等于股票；当前每枚代币约对应 $($multiplier.ToString('0.0000', [Globalization.CultureInfo]::InvariantCulture)) 份基础股票，并受托管、鉴证和地区规则约束。";
          volumeChange = 0; market = 'stock'; venue = 'Binance Web3'; sector = '链上币股'
        })
      } catch { }
    }
    $providers.Add([pscustomobject]@{ name = 'Binance Web3'; product = 'Ondo 链上币股目录'; count = $listingMap.Count; status = 'live' })
  } catch {
    $providers.Add([pscustomobject]@{ name = 'Binance Web3'; product = 'Ondo 链上币股目录'; count = 0; status = 'unavailable' })
  }

  if ($assets.Count -eq 0) { throw 'No tokenized-stock provider returned data.' }
  if (-not (Test-Path -LiteralPath $runtimeDirectory)) { New-Item -ItemType Directory -Path $runtimeDirectory | Out-Null }
  $payload = [pscustomobject]@{
    assets = @($assets | Sort-Object symbol, venue)
    providers = @($providers)
    source = (($providers | Where-Object { $_.status -eq 'live' } | ForEach-Object { $_.name }) -join ' + ')
    mode = 'live'
    updatedAt = [DateTimeOffset]::UtcNow.ToString('o')
  }
  [IO.File]::WriteAllText($temporaryPath, ($payload | ConvertTo-Json -Depth 8 -Compress), $utf8)
  Move-Item -LiteralPath $temporaryPath -Destination $cachePath -Force
  Write-Output "Synced $($assets.Count) tokenized-stock rows at $($payload.updatedAt)"
}

do {
  try { Sync-TokenizedStocks } catch { Write-Error $_ -ErrorAction Continue }
  if (-not $Watch) { break }
  Start-Sleep -Seconds 15
} while ($true)
